package dev.kazuki.typingapp.api.repository;

import dev.kazuki.typingapp.api.entity.User;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/** TBL-01 users(db-access.md 4.1)。 */
public interface UserRepository extends JpaRepository<User, Long> {

    /** find-or-create(FR-12)で使う。 */
    Optional<User> findByName(String name);
}
