package com.attendancedesk.attendancedesk.repository;

import com.attendancedesk.attendancedesk.entity.Student;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StudentRepository extends JpaRepository<Student, Integer> {
}