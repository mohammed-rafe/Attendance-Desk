
package com.attendancedesk.attendancedesk.controller;

import com.attendancedesk.attendancedesk.entity.Student;
import com.attendancedesk.attendancedesk.repository.StudentRepository;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/students")
@CrossOrigin(origins = "*")
public class StudentController {

    private final StudentRepository studentRepository;

    public StudentController(StudentRepository studentRepository) {
        this.studentRepository = studentRepository;
    }

    // ==========================================
    // GET: Fetch all students
    // ==========================================
    @GetMapping
    public List<Student> getAllStudents() {
        return studentRepository.findAll();
    }

    // ==========================================
    // GET: Fetch student by ID
    // ==========================================
    @GetMapping("/{id}")
    public Student getStudentById(@PathVariable Integer id) {
        return studentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Student not found with ID: " + id
                ));
    }

    // ==========================================
    // POST: Add a new student
    // ==========================================
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Student addStudent(@RequestBody Student student) {
        student.setStudentId(null);
        return studentRepository.save(student);
    }

    // ==========================================
    // PUT: Update an existing student
    // ==========================================
    @PutMapping("/{id}")
    public Student updateStudent(
            @PathVariable Integer id,
            @RequestBody Student updatedStudent) {

        Student existingStudent = studentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Student not found with ID: " + id
                ));

        if (updatedStudent.getStudentName() != null) {
            existingStudent.setStudentName(
                    updatedStudent.getStudentName()
            );
        }

        if (updatedStudent.getRollNumber() != null) {
            existingStudent.setRollNumber(
                    updatedStudent.getRollNumber()
            );
        }

        if (updatedStudent.getEmail() != null) {
            existingStudent.setEmail(updatedStudent.getEmail());
        }

        if (updatedStudent.getPhone() != null) {
            existingStudent.setPhone(updatedStudent.getPhone());
        }

        if (updatedStudent.getClassId() != null) {
            existingStudent.setClassId(updatedStudent.getClassId());
        }

        return studentRepository.save(existingStudent);
    }

    // ==========================================
    // DELETE: Delete student by ID
    // ==========================================
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteStudent(@PathVariable Integer id) {

        if (!studentRepository.existsById(id)) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Student not found with ID: " + id
            );
        }

        studentRepository.deleteById(id);
    }
}
