package com.wealthwise.wealthwise_backend.cas.controller;

import com.wealthwise.wealthwise_backend.cas.dto.CASUploadRequest;
import com.wealthwise.wealthwise_backend.cas.entity.CASData;
import com.wealthwise.wealthwise_backend.cas.service.CASService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/cas")
@CrossOrigin(origins = "*")
public class CASController {

    @Autowired
    private CASService casService;

    @PostMapping("/upload")
    public ResponseEntity<?> uploadCAS(@RequestBody CASUploadRequest request) {
        try {
            System.out.println("Received CAS upload request for userId=" + request.getUser_id());
            CASData casData = casService.uploadCASData(request);
            return ResponseEntity.ok(casData);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(
                new ErrorResponse("CAS upload failed", e.getMessage())
            );
        }
    }

    static class ErrorResponse {
        private final String error;
        private final String message;

        public ErrorResponse(String error, String message) {
            this.error = error;
            this.message = message;
        }

        public String getError() { return error; }
        public String getMessage() { return message; }
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<CASData>> getCASByUser(@PathVariable Long userId) {
        List<CASData> casList = casService.getCASDataByUser(userId);
        return ResponseEntity.ok(casList);
    }

    @GetMapping("/user/{userId}/fy/{financialYear}")
    public ResponseEntity<Optional<CASData>> getCASByUserAndYear(
            @PathVariable Long userId,
            @PathVariable String financialYear) {
        Optional<CASData> cas = casService.getCASDataByUserAndYear(userId, financialYear);
        return ResponseEntity.ok(cas);
    }
}
