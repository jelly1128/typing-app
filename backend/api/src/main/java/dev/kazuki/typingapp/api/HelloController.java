package dev.kazuki.typingapp.api;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HelloController {

    private final JdbcTemplate jdbcTemplate;

    public HelloController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @GetMapping("/api/hello")
    public String hello() {
        return jdbcTemplate.queryForObject("SELECT 'Hello from PostgreSQL'", String.class);
    }
}
