package dev.kazuki.typingapp.api.exception;

/**
 * 特定のドメイン専用例外(例: {@link InvalidSessionSubmissionException})を作るほどではない、
 * 単純な入力チェック失敗を表す汎用の400例外(class-design.md 1.4、CL-019)。
 */
public class InvalidRequestException extends RuntimeException {

    public InvalidRequestException(String message) {
        super(message);
    }
}
