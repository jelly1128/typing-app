package dev.kazuki.typingapp.api.exception;

/** topicSetIdに対応するお題セットが存在しない(404、class-design.md 1.4)。 */
public class TopicSetNotFoundException extends RuntimeException {

    private final Long topicSetId;

    public TopicSetNotFoundException(Long topicSetId) {
        super("topic set not found: id=" + topicSetId);
        this.topicSetId = topicSetId;
    }

    public Long getTopicSetId() {
        return topicSetId;
    }
}
