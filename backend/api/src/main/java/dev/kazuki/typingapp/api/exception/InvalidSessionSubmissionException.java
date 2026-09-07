package dev.kazuki.typingapp.api.exception;

/** セッション送信内容が値域外(400、class-design.md 1.4の値域チェック表)。 */
public class InvalidSessionSubmissionException extends RuntimeException {

    public InvalidSessionSubmissionException(String message) {
        super(message);
    }
}
