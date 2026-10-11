package com.attendancedesk.attendancedesk.repository;

import com.attendancedesk.attendancedesk.entity.ClassEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ClassRepository extends JpaRepository<ClassEntity, Integer> {
}