package dev.kazuki.typingapp.api.dto;

import dev.kazuki.typingapp.api.entity.CharType;

/** {@code api-spec.yaml} `MissRecordInput`スキーマ(FR-04)。 */
public record MissRecordInputDto(
        Integer kanaOccurrenceNo,
        String kana,
        String expectedKey,
        String actualKey,
        String prevKana,
        CharType charType) {}
