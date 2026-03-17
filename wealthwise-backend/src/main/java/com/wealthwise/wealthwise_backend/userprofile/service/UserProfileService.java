package com.wealthwise.wealthwise_backend.userprofile.service;

import com.wealthwise.wealthwise_backend.userprofile.dto.UpdateEmailRequest;
import com.wealthwise.wealthwise_backend.userprofile.dto.UpdateNameRequest;
import com.wealthwise.wealthwise_backend.userprofile.dto.UpdatePasswordRequest;
import com.wealthwise.wealthwise_backend.userprofile.dto.UpdatePhoneRequest;
import com.wealthwise.wealthwise_backend.userprofile.dto.UserProfileDTO;
import com.wealthwise.wealthwise_backend.userprofile.entity.ProfileActivityLog;
import com.wealthwise.wealthwise_backend.userprofile.entity.UserProfileDetails;
import com.wealthwise.wealthwise_backend.userprofile.repository.ProfileActivityLogRepository;
import com.wealthwise.wealthwise_backend.userprofile.repository.UserProfileRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class UserProfileService {

    @Autowired
    private UserProfileRepository repository;

    @Autowired
    private ProfileActivityLogRepository logRepository; // ✅ ADDED

    @Autowired
    private com.wealthwise.wealthwise_backend.auth.service.AuthService authService; // ✅ Sync to Auth table

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    // CREATE
    public UserProfileDTO createProfile(UserProfileDTO dto) {
        if (dto.getUserId() == null)
            throw new IllegalArgumentException("userId is required");
        if (dto.getName() == null || dto.getName().trim().isEmpty())
            throw new IllegalArgumentException("Name is required");
        if (dto.getEmail() == null || dto.getEmail().trim().isEmpty())
            throw new IllegalArgumentException("Email is required");
        if (dto.getPassword() == null || dto.getPassword().trim().isEmpty())
            throw new IllegalArgumentException("Password is required");

        Optional<UserProfileDetails> existingEmail = repository.findByEmail(dto.getEmail());
        if (existingEmail.isPresent())
            throw new IllegalArgumentException("Email already registered");

        UserProfileDetails profile = UserProfileDetails.builder()
                .userId(dto.getUserId())
                .name(dto.getName().trim())
                .email(dto.getEmail().trim())
                .phone(dto.getPhone())
                .password(passwordEncoder.encode(dto.getPassword()))
                .build();

        UserProfileDetails saved = repository.save(profile);

        // ✅ Log profile creation
        logRepository.save(new ProfileActivityLog(
            saved.getUserId(), "PROFILE CREATED", null, "Profile created"
        ));

        return toDTO(saved);
    }

    // GET by profileId
    public UserProfileDTO getProfileById(Long profileId) {
        return toDTO(findById(profileId));
    }

    // GET by userId
    public UserProfileDTO getProfileByUserId(Long userId) {
        UserProfileDetails profile = repository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("Profile not found for userId: " + userId));
        return toDTO(profile);
    }

    // UPDATE NAME
    public UserProfileDTO updateName(Long profileId, UpdateNameRequest request) {
        if (request.getName() == null || request.getName().trim().isEmpty())
            throw new IllegalArgumentException("Name cannot be empty");
        UserProfileDetails profile = findById(profileId);

        String oldName = profile.getName(); // ✅ save old value

        profile.setName(request.getName().trim());
        UserProfileDetails saved = repository.save(profile);

        // ✅ Sync to Auth table
        authService.updateUserName(profile.getUserId(), saved.getName());

        // ✅ Log the change
        logRepository.save(new ProfileActivityLog(
            saved.getUserId(), "Name", oldName, saved.getName()
        ));

        return toDTO(saved);
    }

    // UPDATE EMAIL
    public UserProfileDTO updateEmail(Long profileId, UpdateEmailRequest request) {
        if (request.getNewEmail() == null || request.getNewEmail().trim().isEmpty())
            throw new IllegalArgumentException("Email cannot be empty");
        Optional<UserProfileDetails> existing = repository.findByEmail(request.getNewEmail());
        if (existing.isPresent() && !existing.get().getProfileId().equals(profileId))
            throw new IllegalArgumentException("Email already in use");

        UserProfileDetails profile = findById(profileId);

        String oldEmail = profile.getEmail(); // ✅ save old value

        profile.setEmail(request.getNewEmail().trim());
        UserProfileDetails saved = repository.save(profile);

        // ✅ Sync to Auth table
        authService.updateUserEmail(profile.getUserId(), saved.getEmail());

        // ✅ Log the change
        logRepository.save(new ProfileActivityLog(
            saved.getUserId(), "Email", oldEmail, saved.getEmail()
        ));

        return toDTO(saved);
    }

    // UPDATE PHONE
    public UserProfileDTO updatePhone(Long profileId, UpdatePhoneRequest request) {
        if (request.getPhone() == null || request.getPhone().trim().isEmpty())
            throw new IllegalArgumentException("Phone cannot be empty");

        UserProfileDetails profile = findById(profileId);

        String oldPhone = profile.getPhone(); // ✅ save old value

        profile.setPhone(request.getPhone().trim());
        UserProfileDetails saved = repository.save(profile);

        // ✅ Log the change
        logRepository.save(new ProfileActivityLog(
            saved.getUserId(), "Phone", oldPhone, saved.getPhone()
        ));

        return toDTO(saved);
    }

    // UPDATE PASSWORD
    public String updatePassword(Long profileId, UpdatePasswordRequest request) {
        UserProfileDetails profile = findById(profileId);
        if (!passwordEncoder.matches(request.getCurrentPassword(), profile.getPassword()))
            throw new IllegalArgumentException("Current password is incorrect");
        if (!request.getNewPassword().equals(request.getConfirmPassword()))
            throw new IllegalArgumentException("Passwords do not match");
        if (request.getNewPassword().length() < 6)
            throw new IllegalArgumentException("Password must be at least 6 characters");

        profile.setPassword(passwordEncoder.encode(request.getNewPassword()));
        repository.save(profile);

        // ✅ Log the change — never log actual password
        logRepository.save(new ProfileActivityLog(
            profile.getUserId(), "Password", "••••••••", "••••••••  (changed)"
        ));

        return "Password updated successfully";
    }

    // DELETE
    public void deleteProfile(Long profileId) {
        if (!repository.existsById(profileId))
            throw new RuntimeException("Profile not found with id: " + profileId);
        repository.deleteById(profileId);
    }

    // ✅ GET ACTIVITY LOG
    public List<ProfileActivityLog> getActivityLog(Long userId) {
        return logRepository.findByUserIdOrderByChangedAtDesc(userId);
    }

    // Private helpers
    private UserProfileDetails findById(Long profileId) {
        return repository.findById(profileId)
                .orElseThrow(() -> new RuntimeException("Profile not found with id: " + profileId));
    }

    private UserProfileDTO toDTO(UserProfileDetails p) {
        return UserProfileDTO.builder()
                .profileId(p.getProfileId())
                .userId(p.getUserId())
                .name(p.getName())
                .email(p.getEmail())
                .phone(p.getPhone())
                .createdDate(p.getCreatedDate())
                .build();
    }
}