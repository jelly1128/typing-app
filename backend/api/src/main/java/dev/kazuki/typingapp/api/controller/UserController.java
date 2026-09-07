package dev.kazuki.typingapp.api.controller;

import dev.kazuki.typingapp.api.dto.IdentifyUserRequest;
import dev.kazuki.typingapp.api.dto.UserResponse;
import dev.kazuki.typingapp.api.service.UserService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/** {@code POST /api/users}(FR-12)。 */
@RestController
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping("/api/users")
    public UserResponse identifyUser(@RequestBody IdentifyUserRequest request) {
        return userService.identifyUser(request.name());
    }
}
