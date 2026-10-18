
package com.attendancedesk.attendancedesk.repository;

import com.attendancedesk.attendancedesk.entity.Attendance;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface AttendanceRepository
        extends JpaRepository<Attendance, Integer> {

    List<Attendance> findByAttendanceDate(LocalDate attendanceDate);

    List<Attendance> findByStudentId(Integer studentId);

    List<Attendance> findByStudentIdAndAttendanceDate(
            Integer studentId,
            LocalDate attendanceDate
    );

    Optional<Attendance> findByStudentIdAndSubjectIdAndAttendanceDate(
            Integer studentId,
            Integer subjectId,
            LocalDate attendanceDate
    );
}
