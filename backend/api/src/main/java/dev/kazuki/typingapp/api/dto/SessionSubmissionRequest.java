package dev.kazuki.typingapp.api.dto;

import dev.kazuki.typingapp.api.entity.EndConditionType;
import java.util.List;

/** {@code POST /api/sessions}のリクエストボディ(FR-04〜09、`api-spec.yaml` `SessionSubmission`)。 */
public record SessionSubmissionRequest(
        Long userId,
        Long topicSetId,
        EndConditionType endConditionType,
        Integer endConditionValue,
        Integer correctKeyCount,
        Integer durationSeconds,
        List<Integer> keystrokeIntervalsMs,
        List<MissRecordInputDto> missRecords,
        List<KanaCountInputDto> kanaCounts) {}
