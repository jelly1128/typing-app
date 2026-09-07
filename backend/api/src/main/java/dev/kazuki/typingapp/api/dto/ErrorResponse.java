package dev.kazuki.typingapp.api.dto;

import java.time.Instant;

/** 全エンドポイント共通のエラーボディ(api-spec.yaml `ErrorResponse`、NFR-07)。 */
public record ErrorResponse(Instant timestamp, int status, String code, String message, String traceId) {}
