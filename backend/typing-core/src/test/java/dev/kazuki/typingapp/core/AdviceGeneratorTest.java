package dev.kazuki.typingapp.core;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.File;
import java.util.List;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;

class AdviceGeneratorTest {

    // shared/testdata/advice-generation/cases.json の1レコードに対応する型。
    record AdviceCase(
        String id,
        String description,
        MissAnalysisInput input,
        List<String> expected
    ) {}

    @ParameterizedTest(name = "{0}")
    @MethodSource("cases")
    void アドバイス生成が仕様どおり(AdviceCase c) {
        List<String> actual = AdviceGenerator.generate(c.input());
        assertEquals(c.expected(), actual, c.id());
    }

    static List<AdviceCase> cases() throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        String testdataDir = System.getProperty(
            "sharedTestdataDir",
            "../../shared/testdata"
        );
        File file = new File(
            testdataDir,
            "advice-generation/cases.json"
        );
        return mapper.readValue(
            file,
            new TypeReference<List<AdviceCase>>() {}
        );
    }
}
