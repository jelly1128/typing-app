package dev.kazuki.typingapp.api.exception;

/** userIdに対応する利用者が存在しない(404、class-design.md 1.4)。 */
public class UserNotFoundException extends RuntimeException {

    private final Long userId;

    public UserNotFoundException(Long userId) {
        super("user not found: id=" + userId);
        this.userId = userId;
    }

    public Long getUserId() {
        return userId;
    }
}
