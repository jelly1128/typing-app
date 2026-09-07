package dev.kazuki.typingapp.api.exception;

import dev.kazuki.typingapp.api.dto.ErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

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
        return handleNotFound("USER_NOT_FOUND", "userId", ex.getUserId(), ex.getMessage(), request);
    }

    @ExceptionHandler(TopicSetNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleTopicSetNotFound(
            TopicSetNotFoundException ex, HttpServletRequest request) {
        return handleNotFound(
                "TOPIC_SET_NOT_FOUND", "topicSetId", ex.getTopicSetId(), ex.getMessage(), request);
    }

    @ExceptionHandler(InvalidSessionSubmissionException.class)
    public ResponseEntity<ErrorResponse> handleInvalidSessionSubmission(
            InvalidSessionSubmissionException ex, HttpServletRequest request) {
        return handleValidationError(ex.getMessage(), request);
    }

    @ExceptionHandler(InvalidRequestException.class)
    public ResponseEntity<ErrorResponse> handleInvalidRequest(
            InvalidRequestException ex, HttpServletRequest request) {
        return handleValidationError(ex.getMessage(), request);
    }

    /** 不正なJSON・型不一致でリクエストボディを読めない場合。 */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleHttpMessageNotReadable(
            HttpMessageNotReadableException ex, HttpServletRequest request) {
        return handleValidationError("リクエストボディの形式が不正です", request);
    }

    /** パスパラメータ・クエリパラメータが期待する型に変換できない場合(例: 数値であるべき箇所に文字列)。 */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ErrorResponse> handleMethodArgumentTypeMismatch(
            MethodArgumentTypeMismatchException ex, HttpServletRequest request) {
        return handleValidationError("パラメータ " + ex.getName() + " の形式が不正です", request);
    }

    /**
     * 上記のいずれにも当てはまらない未捕捉例外。DataIntegrityViolationException・
     * CannotGetJdbcConnectionException等のDBアクセス関連例外(class-design.md 1.4の対応表)も
     * ここに含む(専用ハンドラを用意しても同じ500/INTERNAL_ERRORになるだけのため一本化)。
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleUnexpected(Exception ex, HttpServletRequest request) {
        String traceId = newTraceId();
        log.error(
                "traceId={} endpoint={} {}", traceId, request.getMethod(), request.getRequestURI(), ex);
        return errorResponse(
                HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", "サーバー内部でエラーが発生しました", traceId);
    }

    private ResponseEntity<ErrorResponse> handleNotFound(
            String code, String idLabel, Object idValue, String message, HttpServletRequest request) {
        String traceId = newTraceId();
        log.warn(
                "traceId={} endpoint={} {} {}={}",
                traceId,
                request.getMethod(),
                request.getRequestURI(),
                idLabel,
                idValue);
        return errorResponse(HttpStatus.NOT_FOUND, code, message, traceId);
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
