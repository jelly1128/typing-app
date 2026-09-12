// PreToolUse hook(Bashツール用)。破壊的コマンドをブロックする(P7-05)。
// .claude/settings.json の permissions.deny(前方一致のみ)を補い、フラグの順序違い
// (git clean -df 等)や git push --force-with-lease のような表記ゆれも検知する。
let stdin = '';
process.stdin.on('data', (chunk) => {
  stdin += chunk;
});
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(stdin);
    const command = (input.tool_input && input.tool_input.command) || '';
    if (isDestructive(command)) {
      const output = {
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'deny',
          permissionDecisionReason:
            '破壊的コマンドの疑いがあるためPreToolUse hookでブロックしました。' +
            '本当に必要な場合はKazuki自身のターミナル(!コマンド)で実行してください: ' +
            command,
        },
      };
      process.stdout.write(JSON.stringify(output));
    }
  } catch (e) {
    // JSON解析に失敗した場合は何もしない(ブロックしない側に倒す)
  }
});

function hasFlag(command, shortLetter, longName) {
  // 大文字フラグ(rmの-Rf等)も検知できるよう大文字小文字を区別しない(code-review指摘)
  const shortPattern = new RegExp('-[a-zA-Z]*' + shortLetter + '[a-zA-Z]*', 'i');
  const longPattern = new RegExp('--' + longName, 'i');
  return shortPattern.test(command) || longPattern.test(command);
}

function isDestructive(command) {
  if (/rm\s/i.test(command) && hasFlag(command, 'r', 'recursive') && hasFlag(command, 'f', 'force')) {
    return true;
  }
  if (/git\s+reset\s/i.test(command) && /--hard/i.test(command)) {
    return true;
  }
  if (/git\s+clean\s/i.test(command) && hasFlag(command, 'f', 'force')) {
    return true;
  }
  if (/git\s+push\s/i.test(command) && (/--force/i.test(command) || /(^|\s)-f(\s|$)/i.test(command))) {
    return true;
  }
  if (
    /git\s+branch\s/i.test(command) &&
    (/-D(\s|$)/.test(command) || (/--delete/i.test(command) && (/--force/i.test(command) || /(^|\s)-f(\s|$)/i.test(command))))
  ) {
    return true;
  }
  if (/git\s+checkout\s/i.test(command) && /--\s/.test(command)) {
    return true;
  }
  // git restoreは git checkout -- と同じく未コミットの変更を破棄する(code-review指摘)
  if (/git\s+restore\s/i.test(command)) {
    return true;
  }
  return false;
}
