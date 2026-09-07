package dev.kazuki.typingapp.api.exception;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * {@link GlobalExceptionHandler}の動作確認専用のテスト用Controller。
 * まだ本物のController(P5-07以降)が無いため、各例外を意図的に投げるだけのエンドポイントを用意する。
 */
@RestController
class ThrowingTestController {

    @GetMapping("/test/user-not-found")
    void userNotFound() {
        throw new UserNotFoundException(42L);
    }

    @GetMapping("/test/topic-set-not-found")
    void topicSetNotFound() {
        throw new TopicSetNotFoundException(7L);
    }

    @GetMapping("/test/invalid-session")
    void invalidSession() {
        throw new InvalidSessionSubmissionException("durationSeconds must not be negative");
    }

    @GetMapping("/test/data-access")
    void dataAccess() {
        throw new DataIntegrityViolationException("duplicate key");
    }

    @GetMapping("/test/unexpected")
    void unexpected() {
        throw new IllegalStateException("boom");
    }
}
