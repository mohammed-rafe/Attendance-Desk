
package com.attendancedesk.attendancedesk.controller;

import com.attendancedesk.attendancedesk.entity.Subject;
import com.attendancedesk.attendancedesk.repository.SubjectRepository;
import com.attendancedesk.attendancedesk.repository.ClassRepository;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/subjects")
@CrossOrigin(origins = "*")
public class SubjectController {

    private final SubjectRepository subjectRepository;
    private final ClassRepository classRepository;

    public SubjectController(
            SubjectRepository subjectRepository,
            ClassRepository classRepository) {
        this.subjectRepository = subjectRepository;
        this.classRepository = classRepository;
    }

    @GetMapping
    public List<Subject> getAllSubjects() {
        return subjectRepository.findAll();
    }

    @GetMapping("/class/{classId}")
    public List<Subject> getSubjectsByClass(
            @PathVariable Integer classId) {
        return subjectRepository.findBySchoolClass_ClassId(classId);
    }

    @PostMapping
    public ResponseEntity<?> createSubject(
            @RequestBody Map<String, Object> request) {

        String name = String.valueOf(
                request.getOrDefault("subjectName", "")
        ).trim();

        if (name.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Subject name is required"));
        }

        Object classValue = request.get("classId");

        if (classValue == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Class is required"));
        }

        Integer classId;

        try {
            classId = Integer.valueOf(classValue.toString());
        } catch (NumberFormatException exception) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Invalid class ID"));
        }

        var classResult = classRepository.findById(classId);

        if (classResult.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Class not found"));
        }

        if (subjectRepository
                .existsBySubjectNameIgnoreCaseAndSchoolClass_ClassId(
                        name, classId)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of(
                            "message",
                            "Subject already exists for this class"
                    ));
        }

        Subject subject = new Subject();
        subject.setSubjectName(name);
        subject.setSchoolClass(classResult.get());

        Subject savedSubject = subjectRepository.save(subject);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(savedSubject);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateSubject(
            @PathVariable Integer id,
            @RequestBody Map<String, Object> request) {

        var subjectResult = subjectRepository.findById(id);

        if (subjectResult.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Subject subject = subjectResult.get();

        String name = subject.getSubjectName();
        Integer classId = subject.getSchoolClass() != null
                ? subject.getSchoolClass().getClassId()
                : null;

        if (request.containsKey("subjectName")) {
            name = String.valueOf(request.get("subjectName")).trim();

            if (name.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(Map.of(
                                "message",
                                "Subject name is required"
                        ));
            }
        }

        if (request.containsKey("classId")) {
            try {
                classId = Integer.valueOf(
                        request.get("classId").toString()
                );
            } catch (NumberFormatException exception) {
                return ResponseEntity.badRequest()
                        .body(Map.of("message", "Invalid class ID"));
            }

            var classResult = classRepository.findById(classId);

            if (classResult.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("message", "Class not found"));
            }

            subject.setSchoolClass(classResult.get());
        }

        if (classId != null
                && subjectRepository
                .existsBySubjectNameIgnoreCaseAndSchoolClass_ClassId(
                        name, classId)
                && !name.equalsIgnoreCase(subject.getSubjectName())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of(
                            "message",
                            "Subject already exists for this class"
                    ));
        }

        subject.setSubjectName(name);

        return ResponseEntity.ok(subjectRepository.save(subject));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteSubject(@PathVariable Integer id) {

        if (!subjectRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }

        subjectRepository.deleteById(id);

        return ResponseEntity.noContent().build();
    }
}
