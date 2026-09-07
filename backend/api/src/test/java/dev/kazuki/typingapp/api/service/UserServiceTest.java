package dev.kazuki.typingapp.api.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import dev.kazuki.typingapp.api.dto.UserResponse;
import dev.kazuki.typingapp.api.exception.InvalidRequestException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

/** 実DB(docker)に接続してfind-or-createの実際の挙動を確認する(P5-07)。 */
@SpringBootTest
@Transactional
class UserServiceTest {

    @Autowired private UserService userService;

    @Test
    void identifyUser_createsNewUserWhenNameIsUnknown() {
        UserResponse response = userService.identifyUser("たいぴんぐ太郎");

        assertThat(response.id()).isNotNull();
        assertThat(response.name()).isEqualTo("たいぴんぐ太郎");
    }

    @Test
    void identifyUser_findsExistingUserOnSecondCall() {
        UserResponse first = userService.identifyUser("たいぴんぐ次郎");
        UserResponse second = userService.identifyUser("たいぴんぐ次郎");

        assertThat(second.id()).isEqualTo(first.id());
    }

    @Test
    void identifyUser_trimsWhitespace() {
        UserResponse response = userService.identifyUser("  たいぴんぐ三郎  ");

        assertThat(response.name()).isEqualTo("たいぴんぐ三郎");
    }

    @Test
    void identifyUser_rejectsNullName() {
        assertThatThrownBy(() -> userService.identifyUser(null)).isInstanceOf(InvalidRequestException.class);
    }

    @Test
    void identifyUser_rejectsEmptyNameAfterTrim() {
        assertThatThrownBy(() -> userService.identifyUser("   ")).isInstanceOf(InvalidRequestException.class);
    }

    @Test
    void identifyUser_rejectsNameLongerThan100Characters() {
        String tooLong = "あ".repeat(101);

        assertThatThrownBy(() -> userService.identifyUser(tooLong))
                .isInstanceOf(InvalidRequestException.class);
    }
}
