const { ipcRenderer } = require('electron');
const esprima = require('esprima');
const fs = require('fs-extra');
const path = require('path');

// ファイルエクスプローラー
ipcRenderer.send('get-files', './public/workspace');
ipcRenderer.on('files-list', (event, files) => {
  const explorer = document.getElementById('explorer');
  explorer.innerHTML = '<h3>Workspace</h3>';
  files.forEach(file => {
    const div = document.createElement('div');
    div.className = 'file-item';
    div.textContent = file.name;
    div.onclick = () => {
      ipcRenderer.send('read-file', file.path);
    };
    explorer.appendChild(div);
  });
});

ipcRenderer.on('file-content', (event, content) => {
  editor.setValue(content);
});

// オートコンプリート
monaco.languages.registerCompletionItemProvider('javascript', {
  provideCompletionItems: (model, position) => {
    return {
      suggestions: [
        {
          label: 'console',
          kind: monaco.languages.CompletionItemKind.Variable,
          insertText: 'console',
        },
        {
          label: 'log',
          kind: monaco.languages.CompletionItemKind.Method,
          insertText: 'console.log(${1});',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        },
      ],
    };
  },
});

// コードナビゲーション（関数定義へのジャンプ）
editor.onDidChangeModelContent(() => {
  const code = editor.getValue();
  try {
    const ast = esprima.parseScript(code, { loc: true });
    const symbols = [];
    ast.body.forEach(node => {
      if (node.type === 'FunctionDeclaration') {
        symbols.push({
          name: node.id.name,
          line: node.loc.start.line,
        });
      }
    });

    monaco.languages.registerDefinitionProvider('javascript', {
      provideDefinition: (model, position) => {
        const word = model.getWordAtPosition(position);
        const symbol = symbols.find(s => s.name === word.word);
        if (symbol) {
          return {
            uri: model.uri,
            range: {
              startLineNumber: symbol.line,
              startColumn: 1,
              endLineNumber: symbol.line,
              endColumn: 1,
            },
          };
        }
        return null;
      },
    });
  } catch (e) {
    console.error('AST parsing error:', e);
  }
});

// ライブプレビュー
editor.onDidChangeModelContent(() => {
  const code = editor.getValue();
  const previewPath = path.join(__dirname, 'public', 'preview.html');
  fs.writeFileSync(previewPath, `
    <html>
      <body>
        <script>${code}</script>
      </body>
    </html>
  `);
  document.getElementById('preview').contentWindow.location.reload();
});

// リファクタリング（変数名変更）
function renameVariable() {
  const position = editor.getPosition();
  const word = editor.getModel().getWordAtPosition(position);
  if (!word) return;

  const newName = prompt('New variable name:', word.word);
  if (!newName) return;

  let code = editor.getValue();
  const regex = new RegExp(`\\b${word.word}\\b`, 'g');
  code = code.replace(regex, newName);
  editor.setValue(code);
}

editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.F2, renameVariable)
