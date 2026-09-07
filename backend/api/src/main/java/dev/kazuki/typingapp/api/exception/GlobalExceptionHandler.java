package dev.kazuki.typingapp.api.exception;

import dev.kazuki.typingapp.api.dto.ErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.util.UUID;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * 例外→{@link ErrorResponse}変換を1箇所に集約する(class-design.md 1.4、NFR-07)。
 * リクエストごとにtraceIdを採番し、レスポンスとログの両方に同じ値を出す。
 * 4xxはWARN1行(スタックトレース無し)、500はERROR+スタックトレースで出力する。
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(UserNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleUserNotFound(
            UserNotFoundException ex, HttpServletRequest request) {
        String traceId = newTraceId();
        log.warn(
                "traceId={} endpoint={} {} userId={}",
                traceId,
                request.getMethod(),
                request.getRequestURI(),
                ex.getUserId());
        return errorResponse(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", ex.getMessage(), traceId);
    }

    @ExceptionHandler(TopicSetNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleTopicSetNotFound(
            TopicSetNotFoundException ex, HttpServletRequest request) {
        String traceId = newTraceId();
        log.warn(
                "traceId={} endpoint={} {} topicSetId={}",
                traceId,
                request.getMethod(),
                request.getRequestURI(),
                ex.getTopicSetId());
        return errorResponse(HttpStatus.NOT_FOUND, "TOPIC_SET_NOT_FOUND", ex.getMessage(), traceId);
    }

    @ExceptionHandler(InvalidSessionSubmissionException.class)
    public ResponseEntity<ErrorResponse> handleInvalidSessionSubmission(
            InvalidSessionSubmissionException ex, HttpServletRequest request) {
        return handleValidationError(ex.getMessage(), request);
    }

    /** Bean Validation失敗(@Valid)。現時点でこの経路を使うControllerは無いが、対応表どおりに用意しておく。 */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleMethodArgumentNotValid(
            MethodArgumentNotValidException ex, HttpServletRequest request) {
        String detail =
                ex.getBindingResult().getFieldErrors().stream()
                        .map(fe -> fe.getField() + ": " + fe.getDefaultMessage())
                        .collect(Collectors.joining(", "));
        return handleValidationError(detail, request);
    }

    /** 不正なJSON・型不一致でリクエストボディを読めない場合。 */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleHttpMessageNotReadable(
            HttpMessageNotReadableException ex, HttpServletRequest request) {
        return handleValidationError("リクエストボディの形式が不正です", request);
    }

    /**
     * DataIntegrityViolationException・CannotGetJdbcConnectionException等、DBアクセス関連の例外を
     * まとめて扱う(いずれもDataAccessExceptionのサブクラス。class-design.md 1.4の対応表2行分)。
     */
    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<ErrorResponse> handleDataAccess(
            DataAccessException ex, HttpServletRequest request) {
        return handleUnexpected(ex, request);
    }

    /** 上記のいずれにも当てはまらない未捕捉例外。 */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleUnexpected(Exception ex, HttpServletRequest request) {
        String traceId = newTraceId();
        log.error(
                "traceId={} endpoint={} {}", traceId, request.getMethod(), request.getRequestURI(), ex);
        return errorResponse(
                HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", "サーバー内部でエラーが発生しました", traceId);
    }

    private ResponseEntity<ErrorResponse> handleValidationError(
            String message, HttpServletRequest request) {
        String traceId = newTraceId();
        log.warn(
                "traceId={} endpoint={} {} message={}",
                traceId,
                request.getMethod(),
                request.getRequestURI(),
                message);
        return errorResponse(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", message, traceId);
    }

    private ResponseEntity<ErrorResponse> errorResponse(
            HttpStatus status, String code, String message, String traceId) {
        ErrorResponse body = new ErrorResponse(Instant.now(), status.value(), code, message, traceId);
        return ResponseEntity.status(status).body(body);
    }

    private String newTraceId() {
        return UUID.randomUUID().toString();
    }
}
