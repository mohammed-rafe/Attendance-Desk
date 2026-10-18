package com.attendancedesk.attendancedesk.repository;




import com.attendancedesk.attendancedesk.entity.Subject;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SubjectRepository extends JpaRepository<Subject, Integer> {

    List<Subject> findBySchoolClass_ClassId(Integer classId);

    boolean existsBySubjectNameIgnoreCaseAndSchoolClass_ClassId(
        String subjectName,
        Integer classId
    );
}
