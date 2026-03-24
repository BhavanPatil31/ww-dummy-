package com.wealthwise.wealthwise_backend.userprofile.controller;

import com.wealthwise.wealthwise_backend.userprofile.dto.UpdateEmailRequest;
import com.wealthwise.wealthwise_backend.userprofile.dto.UpdateNameRequest;

import com.wealthwise.wealthwise_backend.userprofile.dto.UpdatePhoneRequest;
import com.wealthwise.wealthwise_backend.userprofile.dto.UserProfileDTO;
import com.wealthwise.wealthwise_backend.userprofile.service.UserProfileService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@CrossOrigin(origins = "*", allowedHeaders = "*")
@RestController
@RequestMapping("/api/profiles")
public class UserProfileController {

    @Autowired
    private UserProfileService service;

    @PostMapping
    public ResponseEntity<?> create(@RequestBody UserProfileDTO dto) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(service.createProfile(dto));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/{profileId}")
    public ResponseEntity<?> getById(@PathVariable Long profileId) {
        try {
            return ResponseEntity.ok(service.getProfileById(profileId));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        }
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getByUserId(@PathVariable Long userId) {
        try {
            return ResponseEntity.ok(service.getProfileByUserId(userId));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        }
    }

    @PatchMapping("/{profileId}/name")
    public ResponseEntity<?> updateName(@PathVariable Long profileId,
                                         @RequestBody UpdateNameRequest request) {
        try {
            return ResponseEntity.ok(service.updateName(profileId, request));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PatchMapping("/{profileId}/email")
    public ResponseEntity<?> updateEmail(@PathVariable Long profileId,
                                          @RequestBody UpdateEmailRequest request) {
        try {
            return ResponseEntity.ok(service.updateEmail(profileId, request));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

 
    
 // ✅ ADD this new 
    @PatchMapping("/{profileId}/phone")
    public ResponseEntity<?> updatePhone(@PathVariable Long profileId,
                                          @RequestBody UpdatePhoneRequest request) {
        try {
            return ResponseEntity.ok(service.updatePhone(profileId, request));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // ✅ ADD this new endpoint for details
    @PatchMapping("/{profileId}/details")
    public ResponseEntity<?> updateDetails(@PathVariable Long profileId,
                                          @RequestBody UserProfileDTO request) {
        try {
            return ResponseEntity.ok(service.updateDetails(profileId, request));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/{profileId}")
    public ResponseEntity<?> delete(@PathVariable Long profileId) {
        try {
            service.deleteProfile(profileId);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        }
    }
    
 // ✅ ADD this in UserProfileController.java
    @GetMapping("/user/{userId}/activity-log")
    public ResponseEntity<?> getActivityLog(@PathVariable Long userId) {
        try {
            return ResponseEntity.ok(service.getActivityLog(userId));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        }
    }
}
