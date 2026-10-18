
package com.attendancedesk.attendancedesk.controller;

import com.attendancedesk.attendancedesk.entity.Attendance;
import com.attendancedesk.attendancedesk.repository.AttendanceRepository;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/attendance")
@CrossOrigin(origins = "*")
public class AttendanceController {

    private final AttendanceRepository attendanceRepository;

    public AttendanceController(
            AttendanceRepository attendanceRepository) {
        this.attendanceRepository = attendanceRepository;
    }

    @GetMapping
    public List<Attendance> getAllAttendance() {
        return attendanceRepository.findAll();
    }

    @GetMapping("/{id}")
    public Attendance getAttendanceById(@PathVariable Integer id) {
        return attendanceRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Attendance record not found"
                ));
    }

    @PostMapping
    public Attendance saveAttendance(
            @RequestBody Attendance attendance) {

        validateAttendance(attendance);

        return attendanceRepository
                .findByStudentIdAndSubjectIdAndAttendanceDate(
                        attendance.getStudentId(),
                        attendance.getSubjectId(),
                        attendance.getAttendanceDate()
                )
                .map(existing -> {
                    existing.setStatus(attendance.getStatus());
                    if (attendance.getMarkedBy() != null) {
                        existing.setMarkedBy(attendance.getMarkedBy());
                    }
                    return attendanceRepository.save(existing);
                })
                .orElseGet(() -> attendanceRepository.save(attendance));
    }

    @PutMapping("/{id}")
    public Attendance updateAttendance(
            @PathVariable Integer id,
            @RequestBody Attendance updated) {

        Attendance existing = attendanceRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Attendance record not found"
                ));

        validateAttendance(updated);

        existing.setStudentId(updated.getStudentId());
        existing.setSubjectId(updated.getSubjectId());
        existing.setAttendanceDate(updated.getAttendanceDate());
        existing.setStatus(updated.getStatus());

        if (updated.getMarkedBy() != null) {
            existing.setMarkedBy(updated.getMarkedBy());
        }

        return attendanceRepository.save(existing);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteAttendance(@PathVariable Integer id) {
        if (!attendanceRepository.existsById(id)) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Attendance record not found"
            );
        }

        attendanceRepository.deleteById(id);
    }

    private void validateAttendance(Attendance attendance) {
        if (attendance.getStudentId() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Student ID is required"
            );
        }

        if (attendance.getAttendanceDate() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Attendance date is required"
            );
        }

        String status = attendance.getStatus();

        if (status == null ||
                !(status.equals("Present") || status.equals("Absent"))) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Status must be Present or Absent"
            );
        }
    }
}
