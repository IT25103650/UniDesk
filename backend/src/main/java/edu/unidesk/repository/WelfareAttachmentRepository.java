package edu.unidesk.repository;

import edu.unidesk.model.WelfareAttachment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WelfareAttachmentRepository extends JpaRepository<WelfareAttachment, Long> {
    List<WelfareAttachment> findByWelfareCaseId(Long caseId);
}
