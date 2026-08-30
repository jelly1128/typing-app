package dev.kazuki.typingapp.core;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.File;
import java.util.List;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;

class SessionMetricsCalculatorTest {

    // shared/testdata/session-metrics/cases.json の1レコードに対応する型。
    // test-plan.md 3.2のスキーマ(id/description/input/expected)をそのままJacksonでマッピングする。
    record SessionMetricsCase(
        String id,
        String description,
        SessionMetricsInput input,
        SessionMetricsResult expected
    ) {}

    // ケースごとに独立したテストとして実行されるようにする
    // (1件失敗しても残りのケースは実行・報告される)。
    @ParameterizedTest(name = "{0}")
    @MethodSource("cases")
    void セッション集計が仕様どおり(SessionMetricsCase c) {
        SessionMetricsResult actual =
            SessionMetricsCalculator.calculate(c.input());
        assertEquals(c.expected(), actual, c.id());
    }

    static List<SessionMetricsCase> cases() throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        // pom.xmlのsurefire設定がsharedTestdataDirを絶対パスで渡す(mvn実行時)。
        // 無い場合はIDE等から実行された場合のフォールバックとして相対パスを使う。
        String testdataDir = System.getProperty(
            "sharedTestdataDir",
            "../../shared/testdata"
        );
        File file = new File(
            testdataDir,
            "session-metrics/cases.json"
        );
        return mapper.readValue(
            file,
            new TypeReference<List<SessionMetricsCase>>() {}
        );
    }
}
