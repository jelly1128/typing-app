package dev.kazuki.typingapp.api.dto;

/** {@code POST /api/users}のリクエストボディ(FR-12)。 */
public record IdentifyUserRequest(String name) {}
