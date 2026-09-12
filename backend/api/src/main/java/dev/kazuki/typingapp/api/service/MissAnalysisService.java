package dev.kazuki.typingapp.api.service;

import dev.kazuki.typingapp.api.dto.CharTypeStatDto;
import dev.kazuki.typingapp.api.dto.ErrorPatternStatDto;
import dev.kazuki.typingapp.api.dto.KanaMissStatDto;
import dev.kazuki.typingapp.api.dto.MissAnalysisResponse;
import dev.kazuki.typingapp.api.dto.PrevKanaStatDto;
import dev.kazuki.typingapp.api.entity.CharType;
import dev.kazuki.typingapp.api.exception.UserNotFoundException;
import dev.kazuki.typingapp.api.repository.CharTypeTotalCountProjection;
import dev.kazuki.typingapp.api.repository.ErrorPatternCountProjection;
import dev.kazuki.typingapp.api.repository.KanaTotalCountProjection;
import dev.kazuki.typingapp.api.repository.MissRecordRepository;
import dev.kazuki.typingapp.api.repository.MissUnitProjection;
import dev.kazuki.typingapp.api.repository.SessionKanaCountRepository;
import dev.kazuki.typingapp.api.repository.UserRepository;
import dev.kazuki.typingapp.core.AdviceGenerator;
import dev.kazuki.typingapp.core.CharTypeStat;
import dev.kazuki.typingapp.core.ErrorPatternStat;
import dev.kazuki.typingapp.core.KanaMissStat;
import dev.kazuki.typingapp.core.MissAnalysisInput;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

/** FR-10, FR-11: ミス傾向4観点の集計とアドバイス生成。 */
@Service
public class MissAnalysisService {

    private final UserRepository userRepository;
    private final MissRecordRepository missRecordRepository;
    private final SessionKanaCountRepository sessionKanaCountRepository;

    public MissAnalysisService(
            UserRepository userRepository,
            MissRecordRepository missRecordRepository,
            SessionKanaCountRepository sessionKanaCountRepository) {
        this.userRepository = userRepository;
        this.missRecordRepository = missRecordRepository;
        this.sessionKanaCountRepository = sessionKanaCountRepository;
    }

    public MissAnalysisResponse getMissAnalysis(Long userId) {
        if (!userRepository.existsById(userId)) {
            throw new UserNotFoundException(userId);
        }

        List<MissUnitProjection> missUnits = missRecordRepository.findDistinctMissUnitsByUserId(userId);

        Map<String, Long> kanaTotals =
                sessionKanaCountRepository.sumTotalCountByKana(userId).stream()
                        .collect(
                                Collectors.toMap(
                                        KanaTotalCountProjection::getKana, KanaTotalCountProjection::getTotalCount));
        Map<CharType, Long> charTypeTotals =
                sessionKanaCountRepository.sumTotalCountByCharType(userId).stream()
                        .collect(
                                Collectors.toMap(
                                        CharTypeTotalCountProjection::getCharType,
                                        CharTypeTotalCountProjection::getTotalCount));

        List<KanaMissStatDto> byKana = buildByKana(missUnits, kanaTotals);
        List<ErrorPatternStatDto> byErrorPattern =
                buildByErrorPattern(missRecordRepository.countByExpectedAndActualKey(userId));
        List<PrevKanaStatDto> byPrevKana = buildByPrevKana(missUnits, kanaTotals);
        List<CharTypeStatDto> byCharType = buildByCharType(missUnits, charTypeTotals);

        List<String> advice = AdviceGenerator.generate(toAdviceInput(byKana, byErrorPattern, byCharType));

        return new MissAnalysisResponse(byKana, byErrorPattern, byPrevKana, byCharType, advice);
    }

    /** FR-10(1)。missCount降順→同数ならmissRate降順→さらに同値ならkana昇順(db-access.md 4.3)。 */
    private List<KanaMissStatDto> buildByKana(List<MissUnitProjection> missUnits, Map<String, Long> kanaTotals) {
        Map<String, Long> missCounts =
                missUnits.stream()
                        .collect(Collectors.groupingBy(MissUnitProjection::getKana, Collectors.counting()));

        return missCounts.entrySet().stream()
                .map(
                        e -> {
                            String kana = e.getKey();
                            int missCount = e.getValue().intValue();
                            int occurrenceCount = kanaTotals.getOrDefault(kana, 0L).intValue();
                            double missRate =
                                    occurrenceCount == 0 ? 0.0 : round((double) missCount / occurrenceCount * 100);
                            return new KanaMissStatDto(kana, missCount, occurrenceCount, missRate);
                        })
                .sorted(
                        Comparator.comparingInt(KanaMissStatDto::missCount)
                                .reversed()
                                .thenComparing(Comparator.comparingDouble(KanaMissStatDto::missRate).reversed())
                                .thenComparing(KanaMissStatDto::kana))
                .toList();
    }

    /** FR-10(2)。拍単位ではなく生イベント単位(db-access.md 4.3)。count降順→expectedKey昇順→actualKey昇順。 */
    private List<ErrorPatternStatDto> buildByErrorPattern(List<ErrorPatternCountProjection> errorPatterns) {
        return errorPatterns.stream()
                .map(
                        e ->
                                new ErrorPatternStatDto(
                                        e.getExpectedKey(), e.getActualKey(), e.getCount().intValue()))
                .sorted(
                        Comparator.comparingInt(ErrorPatternStatDto::count)
                                .reversed()
                                .thenComparing(ErrorPatternStatDto::expectedKey)
                                .thenComparing(ErrorPatternStatDto::actualKey))
                .toList();
    }

    /**
     * FR-10(3)。分母は近似(prevKana自体のsession_kana_counts合計、er-diagram.md 3.3)。
     * prevKanaがnull(セッション最初の拍)の行は集計から除外する(db-access.md 4.3)。
     * missRate降順→同値ならprevKana昇順。
     */
    private List<PrevKanaStatDto> buildByPrevKana(List<MissUnitProjection> missUnits, Map<String, Long> kanaTotals) {
        Map<String, Long> missCounts =
                missUnits.stream()
                        .filter(m -> m.getPrevKana() != null)
                        .collect(Collectors.groupingBy(MissUnitProjection::getPrevKana, Collectors.counting()));

        return missCounts.entrySet().stream()
                .map(
                        e -> {
                            String prevKana = e.getKey();
                            long missCount = e.getValue();
                            long total = kanaTotals.getOrDefault(prevKana, 0L);
                            double missRate = total == 0 ? 0.0 : round((double) missCount / total * 100);
                            return new PrevKanaStatDto(prevKana, missRate);
                        })
                .sorted(
                        Comparator.comparingDouble(PrevKanaStatDto::missRate)
                                .reversed()
                                .thenComparing(PrevKanaStatDto::prevKana))
                .toList();
    }

    /**
     * FR-10(4)。出現回数0の文字種は含めない(charTypeTotalsに無い時点で自然に除外される、CL-007)。
     * 並び順は文字種の定義順で固定(CharType enumの宣言順=ordinal()と一致させている)。
     */
    private List<CharTypeStatDto> buildByCharType(
            List<MissUnitProjection> missUnits, Map<CharType, Long> charTypeTotals) {
        Map<CharType, Long> missCounts =
                missUnits.stream()
                        .collect(
                                Collectors.groupingBy(
                                        m -> CharType.valueOf(m.getCharType()), Collectors.counting()));

        return charTypeTotals.entrySet().stream()
                .map(
                        e -> {
                            CharType charType = e.getKey();
                            long occurrenceCount = e.getValue();
                            long missCount = missCounts.getOrDefault(charType, 0L);
                            double accuracyRate = round((double) (occurrenceCount - missCount) / occurrenceCount * 100);
                            return new CharTypeStatDto(charType, (int) occurrenceCount, accuracyRate);
                        })
                .sorted(Comparator.comparingInt(c -> c.charType().ordinal()))
                .toList();
    }

    private static MissAnalysisInput toAdviceInput(
            List<KanaMissStatDto> byKana, List<ErrorPatternStatDto> byErrorPattern, List<CharTypeStatDto> byCharType) {
        return new MissAnalysisInput(
                byKana.stream()
                        .map(k -> new KanaMissStat(k.kana(), k.missCount(), k.occurrenceCount(), k.missRate()))
                        .toList(),
                byErrorPattern.stream()
                        .map(e -> new ErrorPatternStat(e.expectedKey(), e.actualKey(), e.count()))
                        .toList(),
                byCharType.stream()
                        .map(
                                c ->
                                        new CharTypeStat(
                                                c.charType().name(), c.occurrenceCount(), c.accuracyRate()))
                        .toList());
    }

    // missRate/accuracyRateの丸めは出口(この呼び出し元)で1回だけ行う(P3ゲート③検証レビューverify-B4対応)。
    // session-metrics.mdのSessionMetricsCalculator.round()と同じ小数第2位HALF_UP方式に揃えている
    private static double round(double value) {
        return BigDecimal.valueOf(value).setScale(2, RoundingMode.HALF_UP).doubleValue();
    }
}
