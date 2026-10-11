package com.attendancedesk.attendancedesk.controller;

import com.attendancedesk.attendancedesk.entity.ClassEntity;
import com.attendancedesk.attendancedesk.repository.ClassRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/classes")
@CrossOrigin(origins = "*")
public class ClassController {

    private final ClassRepository classRepository;

    public ClassController(ClassRepository classRepository) {
        this.classRepository = classRepository;
    }

    // Get all classes
    @GetMapping
    public List<ClassEntity> getAllClasses() {
        return classRepository.findAll();
    }

    // Add new class
    @PostMapping
    public ClassEntity addClass(
            @RequestBody ClassEntity classEntity) {

        return classRepository.save(classEntity);
    }
}