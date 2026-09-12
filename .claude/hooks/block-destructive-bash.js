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
  const shortPattern = new RegExp('-[a-zA-Z]*' + shortLetter + '[a-zA-Z]*');
  const longPattern = new RegExp('--' + longName);
  return shortPattern.test(command) || longPattern.test(command);
}

function isDestructive(command) {
  if (/rm\s/.test(command) && hasFlag(command, 'r', 'recursive') && hasFlag(command, 'f', 'force')) {
    return true;
  }
  if (/git\s+reset\s/.test(command) && /--hard/.test(command)) {
    return true;
  }
  if (/git\s+clean\s/.test(command) && hasFlag(command, 'f', 'force')) {
    return true;
  }
  if (/git\s+push\s/.test(command) && (/--force/.test(command) || /(^|\s)-f(\s|$)/.test(command))) {
    return true;
  }
  if (
    /git\s+branch\s/.test(command) &&
    (/-D(\s|$)/.test(command) || (/--delete/.test(command) && (/--force/.test(command) || /(^|\s)-f(\s|$)/.test(command))))
  ) {
    return true;
  }
  if (/git\s+checkout\s/.test(command) && /--\s/.test(command)) {
    return true;
  }
  return false;
}
