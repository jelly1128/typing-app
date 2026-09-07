package dev.kazuki.typingapp.api.dto;

import dev.kazuki.typingapp.api.entity.CharType;

/** {@code api-spec.yaml} `KanaCountInput`スキーマ(FR-10)。 */
public record KanaCountInputDto(String kana, CharType charType, Integer totalCount) {}
