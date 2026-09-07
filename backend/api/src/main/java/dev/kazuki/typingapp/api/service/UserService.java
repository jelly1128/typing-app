package dev.kazuki.typingapp.api.service;

import dev.kazuki.typingapp.api.dto.UserResponse;
import dev.kazuki.typingapp.api.entity.User;
import dev.kazuki.typingapp.api.exception.InvalidRequestException;
import dev.kazuki.typingapp.api.repository.UserRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

/** FR-12: 利用者の識別(find-or-create)。 */
@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public UserResponse identifyUser(String name) {
        String trimmed = validateName(name);
        User user = userRepository.findByName(trimmed).orElseGet(() -> createUser(trimmed));
        return new UserResponse(user.getId(), user.getName());
    }

    /**
     * 同名ユーザーが同時に初回登録された場合の競合対策(db-access.md 5章: find-or-createに
     * 明示的な@Transactionalは付けない)。保存時にUNIQUE制約違反が起きたら、既に他方が
     * 作成済みということなのでfindByNameを再実行して既存ユーザーを返す(このメソッドの外側=
     * GlobalExceptionHandlerには到達させない)。
     */
    private User createUser(String name) {
        try {
            return userRepository.save(new User(name));
        } catch (DataIntegrityViolationException e) {
            return userRepository.findByName(name).orElseThrow(() -> e);
        }
    }

    private String validateName(String name) {
        String trimmed = name.trim();
        if (trimmed.isEmpty() || trimmed.length() > 100) {
            throw new InvalidRequestException("name must be 1 to 100 characters after trimming");
        }
        return trimmed;
    }
}
