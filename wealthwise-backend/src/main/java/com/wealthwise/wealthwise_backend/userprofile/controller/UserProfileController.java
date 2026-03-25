package com.wealthwise.wealthwise_backend.userprofile.controller;

import com.wealthwise.wealthwise_backend.userprofile.dto.UpdateEmailRequest;
import com.wealthwise.wealthwise_backend.userprofile.dto.UpdateNameRequest;
import com.wealthwise.wealthwise_backend.userprofile.dto.UpdatePhoneRequest;
import com.wealthwise.wealthwise_backend.userprofile.dto.UserProfileDTO;
import com.wealthwise.wealthwise_backend.userprofile.service.UserProfileService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.lang.NonNull;
import org.springframework.lang.Nullable;
import org.springframework.web.bind.annotation.*;

import java.util.Objects;

@CrossOrigin(origins = "*", allowedHeaders = "*")
@RestController
@RequestMapping("/api/profiles")
public class UserProfileController {

    @Autowired
    private UserProfileService service;

    @PostMapping
    @NonNull
    public ResponseEntity<?> create(@RequestBody @Nullable UserProfileDTO dto) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(service.createProfile(Objects.requireNonNull(dto, "Profile DTO is required")));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/{profileId}")
    @NonNull
    public ResponseEntity<?> getById(@PathVariable @Nullable Long profileId) {
        try {
            return ResponseEntity.ok(service.getProfileById(Objects.requireNonNull(profileId, "Profile ID is required")));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        }
    }

    @GetMapping("/user/{userId}")
    @NonNull
    public ResponseEntity<?> getByUserId(@PathVariable @Nullable Long userId) {
        try {
            return ResponseEntity.ok(service.getProfileByUserId(Objects.requireNonNull(userId, "User ID is required")));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        }
    }

    @PatchMapping("/{profileId}/name")
    @NonNull
    public ResponseEntity<?> updateName(@PathVariable @Nullable Long profileId,
                                         @RequestBody @Nullable UpdateNameRequest request) {
        try {
            return ResponseEntity.ok(service.updateName(
                Objects.requireNonNull(profileId, "Profile ID is required"),
                Objects.requireNonNull(request, "Request body is required")
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PatchMapping("/{profileId}/email")
    @NonNull
    public ResponseEntity<?> updateEmail(@PathVariable @Nullable Long profileId,
                                          @RequestBody @Nullable UpdateEmailRequest request) {
        try {
            return ResponseEntity.ok(service.updateEmail(
                Objects.requireNonNull(profileId, "Profile ID is required"),
                Objects.requireNonNull(request, "Request body is required")
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PatchMapping("/{profileId}/phone")
    @NonNull
    public ResponseEntity<?> updatePhone(@PathVariable @Nullable Long profileId,
                                          @RequestBody @Nullable UpdatePhoneRequest request) {
        try {
            return ResponseEntity.ok(service.updatePhone(
                Objects.requireNonNull(profileId, "Profile ID is required"),
                Objects.requireNonNull(request, "Request body is required")
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PatchMapping("/{profileId}/details")
    @NonNull
    public ResponseEntity<?> updateDetails(@PathVariable @Nullable Long profileId,
                                          @RequestBody @Nullable UserProfileDTO request) {
        try {
            return ResponseEntity.ok(service.updateDetails(
                Objects.requireNonNull(profileId, "Profile ID is required"),
                Objects.requireNonNull(request, "Request body is required")
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/{profileId}")
    @NonNull
    public ResponseEntity<?> delete(@PathVariable @Nullable Long profileId) {
        try {
            service.deleteProfile(Objects.requireNonNull(profileId, "Profile ID is required"));
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        }
    }

    @GetMapping("/user/{userId}/activity-log")
    @NonNull
    public ResponseEntity<?> getActivityLog(@PathVariable @Nullable Long userId) {
        try {
            return ResponseEntity.ok(service.getActivityLog(Objects.requireNonNull(userId, "User ID is required")));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        }
    }
}
