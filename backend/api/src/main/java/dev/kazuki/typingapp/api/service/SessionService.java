package dev.kazuki.typingapp.api.service;

import dev.kazuki.typingapp.api.dto.KanaCountInputDto;
import dev.kazuki.typingapp.api.dto.MissRecordInputDto;
import dev.kazuki.typingapp.api.dto.PersonalBestResponse;
import dev.kazuki.typingapp.api.dto.SessionResultResponse;
import dev.kazuki.typingapp.api.dto.SessionSubmissionRequest;
import dev.kazuki.typingapp.api.dto.SessionSummaryResponse;
import dev.kazuki.typingapp.api.entity.EndConditionType;
import dev.kazuki.typingapp.api.entity.MissRecord;
import dev.kazuki.typingapp.api.entity.Session;
import dev.kazuki.typingapp.api.entity.SessionKanaCount;
import dev.kazuki.typingapp.api.entity.TopicSet;
import dev.kazuki.typingapp.api.entity.User;
import dev.kazuki.typingapp.api.exception.InvalidSessionSubmissionException;
import dev.kazuki.typingapp.api.exception.TopicSetNotFoundException;
import dev.kazuki.typingapp.api.exception.UserNotFoundException;
import dev.kazuki.typingapp.api.repository.MissRecordRepository;
import dev.kazuki.typingapp.api.repository.PersonalBestProjection;
import dev.kazuki.typingapp.api.repository.SessionKanaCountRepository;
import dev.kazuki.typingapp.api.repository.SessionRepository;
import dev.kazuki.typingapp.api.repository.SessionSummaryProjection;
import dev.kazuki.typingapp.api.repository.TopicSetRepository;
import dev.kazuki.typingapp.api.repository.UserRepository;
import dev.kazuki.typingapp.core.SessionMetricsCalculator;
import dev.kazuki.typingapp.core.SessionMetricsInput;
import dev.kazuki.typingapp.core.SessionMetricsResult;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** FR-04〜09: セッション結果の保存・履歴取得・自己ベスト取得。 */
@Service
public class SessionService {

    /** table-definition.md TBL-04 netKpm/rawKpmの桁数上限(NUMERIC(6,2))。 */
    private static final BigDecimal KPM_MAX = new BigDecimal("9999.99");

    private final UserRepository userRepository;
    private final TopicSetRepository topicSetRepository;
    private final SessionRepository sessionRepository;
    private final MissRecordRepository missRecordRepository;
    private final SessionKanaCountRepository sessionKanaCountRepository;

    public SessionService(
            UserRepository userRepository,
            TopicSetRepository topicSetRepository,
            SessionRepository sessionRepository,
            MissRecordRepository missRecordRepository,
            SessionKanaCountRepository sessionKanaCountRepository) {
        this.userRepository = userRepository;
        this.topicSetRepository = topicSetRepository;
        this.sessionRepository = sessionRepository;
        this.missRecordRepository = missRecordRepository;
        this.sessionKanaCountRepository = sessionKanaCountRepository;
    }

    /**
     * userId/topicSetIdの存在確認 → 値域チェック → 算出 → 保存(1トランザクション) → 自己ベスト比較
     * (class-design.md 1.4)。自己ベストのMAXクエリは新しいセッションを保存する前に実行する。
     */
    @Transactional
    public SessionResultResponse submitSession(SessionSubmissionRequest request) {
        validateRequiredFieldsPresent(request);

        User user =
                userRepository.findById(request.userId()).orElseThrow(() -> new UserNotFoundException(request.userId()));
        TopicSet topicSet =
                topicSetRepository
                        .findById(request.topicSetId())
                        .orElseThrow(() -> new TopicSetNotFoundException(request.topicSetId()));

        validateValueRanges(request);

        SessionMetricsResult metrics =
                SessionMetricsCalculator.calculate(
                        new SessionMetricsInput(
                                request.correctKeyCount(),
                                request.missRecords().size(),
                                request.keystrokeIntervalsMs().stream().mapToInt(Integer::intValue).toArray(),
                                request.durationSeconds()));

        BigDecimal netKpm = scaled(metrics.netKpm());
        BigDecimal rawKpm = scaled(metrics.rawKpm());
        BigDecimal accuracy = scaled(metrics.accuracy());
        BigDecimal consistency = scaled(metrics.consistency());

        if (netKpm.compareTo(KPM_MAX) > 0 || rawKpm.compareTo(KPM_MAX) > 0) {
            throw new InvalidSessionSubmissionException(
                    "netKpm/rawKpm exceeds table-definition.md TBL-04 precision (9999.99)");
        }

        PersonalBestProjection previous =
                sessionRepository.findPersonalBest(request.userId(), request.topicSetId());
        PersonalBestResponse previousBest =
                previous.getNetKpmBest() == null
                        ? null
                        : new PersonalBestResponse(
                                request.topicSetId(), previous.getNetKpmBest(), previous.getAccuracyBest());

        boolean isNetKpmBest = previousBest == null || netKpm.compareTo(previousBest.netKpmBest()) > 0;
        boolean isAccuracyBest = previousBest == null || accuracy.compareTo(previousBest.accuracyBest()) > 0;

        Session session =
                sessionRepository.save(
                        new Session(
                                user,
                                topicSet,
                                netKpm,
                                rawKpm,
                                accuracy,
                                consistency,
                                request.durationSeconds(),
                                request.endConditionType(),
                                request.endConditionValue()));

        missRecordRepository.saveAll(
                request.missRecords().stream()
                        .map(
                                m ->
                                        new MissRecord(
                                                session,
                                                m.kanaOccurrenceNo(),
                                                m.kana(),
                                                m.expectedKey(),
                                                m.actualKey(),
                                                m.prevKana(),
                                                m.charType()))
                        .toList());

        sessionKanaCountRepository.saveAll(
                request.kanaCounts().stream()
                        .map(k -> new SessionKanaCount(session, k.kana(), k.charType(), k.totalCount()))
                        .toList());

        return new SessionResultResponse(
                session.getId(),
                netKpm,
                rawKpm,
                accuracy,
                consistency,
                session.getDurationSeconds(),
                session.getPlayedAt(),
                previousBest,
                isNetKpmBest,
                isAccuracyBest);
    }

    /** 履歴一覧(FR-08)。 */
    @Transactional(readOnly = true)
    public List<SessionSummaryResponse> listSessionHistory(Long userId) {
        if (!userRepository.existsById(userId)) {
            throw new UserNotFoundException(userId);
        }
        return sessionRepository.findSummariesByUserIdOrderByPlayedAtDesc(userId).stream()
                .map(SessionService::toSummaryResponse)
                .toList();
    }

    /** 自己ベスト(FR-09)。0件でもnetKpmBest/accuracyBestはnullのまま200で返す。 */
    public PersonalBestResponse getPersonalBest(Long userId, Long topicSetId) {
        if (!userRepository.existsById(userId)) {
            throw new UserNotFoundException(userId);
        }
        if (!topicSetRepository.existsById(topicSetId)) {
            throw new TopicSetNotFoundException(topicSetId);
        }
        PersonalBestProjection best = sessionRepository.findPersonalBest(userId, topicSetId);
        return new PersonalBestResponse(topicSetId, best.getNetKpmBest(), best.getAccuracyBest());
    }

    private static SessionSummaryResponse toSummaryResponse(SessionSummaryProjection p) {
        return new SessionSummaryResponse(
                p.getId(),
                p.getTopicSetName(),
                p.getEndConditionType(),
                p.getEndConditionValue(),
                p.getPlayedAt(),
                p.getNetKpm(),
                p.getAccuracy(),
                p.getDurationSeconds());
    }

    private void validateRequiredFieldsPresent(SessionSubmissionRequest request) {
        if (request.userId() == null
                || request.topicSetId() == null
                || request.endConditionType() == null
                || request.endConditionValue() == null
                || request.correctKeyCount() == null
                || request.durationSeconds() == null
                || request.keystrokeIntervalsMs() == null
                || request.missRecords() == null
                || request.kanaCounts() == null) {
            throw new InvalidSessionSubmissionException("required field is missing");
        }
    }

    /** class-design.md 1.4の値域チェック表。違反時はすべてInvalidSessionSubmissionException(400)。 */
    private void validateValueRanges(SessionSubmissionRequest request) {
        int minEndValue = request.endConditionType() == EndConditionType.sentence_count ? 1 : 10;
        int maxEndValue = request.endConditionType() == EndConditionType.sentence_count ? 50 : 600;
        if (request.endConditionValue() < minEndValue || request.endConditionValue() > maxEndValue) {
            throw new InvalidSessionSubmissionException(
                    "endConditionValue out of range for " + request.endConditionType());
        }
        if (request.durationSeconds() < 0) {
            throw new InvalidSessionSubmissionException("durationSeconds must not be negative");
        }
        if (request.correctKeyCount() < 0) {
            throw new InvalidSessionSubmissionException("correctKeyCount must not be negative");
        }
        if (request.keystrokeIntervalsMs().stream().anyMatch(v -> v < 0)) {
            throw new InvalidSessionSubmissionException("keystrokeIntervalsMs must not contain negative values");
        }

        Set<String> kanaCountKanas = new HashSet<>();
        for (KanaCountInputDto k : request.kanaCounts()) {
            if (!kanaCountKanas.add(k.kana())) {
                throw new InvalidSessionSubmissionException("kanaCounts contains duplicate kana: " + k.kana());
            }
        }
        for (MissRecordInputDto m : request.missRecords()) {
            if (!kanaCountKanas.contains(m.kana())) {
                throw new InvalidSessionSubmissionException(
                        "missRecords contains kana not present in kanaCounts: " + m.kana());
            }
        }
    }

    private static BigDecimal scaled(double value) {
        return BigDecimal.valueOf(value).setScale(2, RoundingMode.HALF_UP);
    }
}
