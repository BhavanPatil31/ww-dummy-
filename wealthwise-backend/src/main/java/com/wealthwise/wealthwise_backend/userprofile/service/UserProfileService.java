package com.wealthwise.wealthwise_backend.userprofile.service;

import com.wealthwise.wealthwise_backend.userprofile.dto.UpdateEmailRequest;
import com.wealthwise.wealthwise_backend.userprofile.dto.UpdateNameRequest;
import com.wealthwise.wealthwise_backend.userprofile.dto.UpdatePhoneRequest;
import com.wealthwise.wealthwise_backend.userprofile.dto.UserProfileDTO;
import com.wealthwise.wealthwise_backend.userprofile.entity.ProfileActivityLog;
import com.wealthwise.wealthwise_backend.userprofile.entity.UserProfileDetails;
import com.wealthwise.wealthwise_backend.userprofile.repository.ProfileActivityLogRepository;
import com.wealthwise.wealthwise_backend.userprofile.repository.UserProfileRepository;
import com.wealthwise.wealthwise_backend.auth.service.AuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.lang.NonNull;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Service
public class UserProfileService {

    @Autowired
    private UserProfileRepository repository;

    @Autowired
    private ProfileActivityLogRepository logRepository;

    @Autowired
    private AuthService authService;

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @NonNull
    public UserProfileDTO createProfile(@NonNull UserProfileDTO dto) {
        if (dto.getUserId() == null) throw new IllegalArgumentException("userId is required");
        if (dto.getName() == null || dto.getName().trim().isEmpty()) throw new IllegalArgumentException("Name is required");
        if (dto.getEmail() == null || dto.getEmail().trim().isEmpty()) throw new IllegalArgumentException("Email is required");
        if (dto.getPassword() == null || dto.getPassword().trim().isEmpty()) throw new IllegalArgumentException("Password is required");

        Optional<UserProfileDetails> existingEmail = repository.findByEmail(dto.getEmail());
        if (existingEmail.isPresent()) throw new IllegalArgumentException("Email already registered");

        UserProfileDetails profile = UserProfileDetails.builder()
                .userId(dto.getUserId())
                .name(dto.getName().trim())
                .email(dto.getEmail().trim())
                .phone(dto.getPhone())
                .password(passwordEncoder.encode(dto.getPassword()))
                .gender(dto.getGender())
                .taxId(dto.getTaxId())
                .taxCountry(dto.getTaxCountry())
                .residentialAddress(dto.getResidentialAddress())
                .build();
        UserProfileDetails saved = Objects.requireNonNull(repository.save(profile), "Saved profile cannot be null");

        Long userId = Optional.ofNullable(saved.getUserId())
                .orElseThrow(() -> new RuntimeException("User ID cannot be null"));

        logRepository.save(new ProfileActivityLog(
            userId, "PROFILE CREATED", null, "Profile created"
        ));

        return toDTO(saved);
    }

    @NonNull
    public UserProfileDTO getProfileById(@NonNull Long profileId) {
        return toDTO(findById(profileId));
    }

    @NonNull
    public UserProfileDTO getProfileByUserId(@NonNull Long userId) {
        // ✅ Explicitly guarantee the found entity is non-null
        UserProfileDetails profile = repository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("Profile not found for userId: " + userId));
        return toDTO(Objects.requireNonNull(profile));
    }

    @NonNull
    public UserProfileDTO updateName(@NonNull Long profileId, @NonNull UpdateNameRequest request) {
        if (request.getName() == null || request.getName().trim().isEmpty()) throw new IllegalArgumentException("Name cannot be empty");
        
        UserProfileDetails profile = findById(profileId);
        String oldName = profile.getName();
        profile.setName(request.getName().trim());
        
        UserProfileDetails saved = Objects.requireNonNull(repository.save(profile), "Saved profile cannot be null");

        Long userId = Optional.ofNullable(profile.getUserId())
                .orElseThrow(() -> new RuntimeException("User ID cannot be null"));
        String name = Optional.ofNullable(saved.getName())
                .orElseThrow(() -> new RuntimeException("Name cannot be null"));

        authService.updateUserName(Objects.requireNonNull(userId), name);
        logRepository.save(new ProfileActivityLog(userId, "Name", oldName, name));

        return toDTO(saved);
    }

    @NonNull
    public UserProfileDTO updateEmail(@NonNull Long profileId, @NonNull UpdateEmailRequest request) {
        if (request.getNewEmail() == null || request.getNewEmail().trim().isEmpty()) throw new IllegalArgumentException("Email cannot be empty");
        
        Optional<UserProfileDetails> existing = repository.findByEmail(request.getNewEmail());
        if (existing.isPresent() && !existing.get().getProfileId().equals(profileId)) throw new IllegalArgumentException("Email already in use");

        UserProfileDetails profile = findById(profileId);
        String oldEmail = profile.getEmail();
        profile.setEmail(request.getNewEmail().trim());
        
        UserProfileDetails saved = Objects.requireNonNull(repository.save(profile), "Saved profile cannot be null");

        Long userId = Optional.ofNullable(profile.getUserId())
                .orElseThrow(() -> new RuntimeException("User ID cannot be null"));
        String email = Optional.ofNullable(saved.getEmail())
                .orElseThrow(() -> new RuntimeException("Email cannot be null"));

        authService.updateUserEmail(Objects.requireNonNull(userId), email);
        logRepository.save(new ProfileActivityLog(userId, "Email", oldEmail, email));

        return toDTO(saved);
    }

    @NonNull
    public UserProfileDTO updatePhone(@NonNull Long profileId, @NonNull UpdatePhoneRequest request) {
        if (request.getPhone() == null || request.getPhone().trim().isEmpty()) throw new IllegalArgumentException("Phone cannot be empty");

        UserProfileDetails profile = findById(profileId);
        String oldPhone = profile.getPhone();
        profile.setPhone(request.getPhone().trim());
        
        UserProfileDetails saved = Objects.requireNonNull(repository.save(profile), "Saved profile cannot be null");

        Long userId = Objects.requireNonNull(saved.getUserId(), "User ID cannot be null");
        logRepository.save(new ProfileActivityLog(userId, "Phone", oldPhone, saved.getPhone()));

        return toDTO(saved);
    }

    @NonNull
    public UserProfileDTO updateDetails(@NonNull Long profileId, @NonNull UserProfileDTO request) {
        UserProfileDetails profile = findById(profileId);
        if (request.getGender() != null) profile.setGender(request.getGender());
        if (request.getTaxId() != null) profile.setTaxId(request.getTaxId());
        if (request.getTaxCountry() != null) profile.setTaxCountry(request.getTaxCountry());
        if (request.getResidentialAddress() != null) profile.setResidentialAddress(request.getResidentialAddress());
        
        UserProfileDetails saved = Objects.requireNonNull(repository.save(profile), "Saved profile cannot be null");

        Long userId = Objects.requireNonNull(saved.getUserId(), "User ID cannot be null");
        logRepository.save(new ProfileActivityLog(userId, "Profile Details", "Old Details", "Updated Details"));

        return toDTO(saved);
    }

    public void deleteProfile(@NonNull Long profileId) {
        if (!repository.existsById(profileId)) throw new RuntimeException("Profile not found with id: " + profileId);
        repository.deleteById(profileId);
    }

    @NonNull
    public List<ProfileActivityLog> getActivityLog(@NonNull Long userId) {
        // ✅ Wrap the list return to guarantee non-nullity
        List<ProfileActivityLog> logs = logRepository.findByUserIdOrderByChangedAtDesc(userId);
        if (logs == null) throw new RuntimeException("Activity log is null");
        return logs;
    }

    @NonNull
    private UserProfileDetails findById(@NonNull Long profileId) {
        UserProfileDetails profile = repository.findById(profileId)
                .orElseThrow(() -> new RuntimeException("Profile not found with id: " + profileId));
        return Objects.requireNonNull(profile);
    }

    @NonNull
    private UserProfileDTO toDTO(@NonNull UserProfileDetails p) {
        // ✅ Wrap the build result to satisfy @NonNull return contract
        UserProfileDTO dto = UserProfileDTO.builder()
                .profileId(p.getProfileId())
                .userId(p.getUserId())
                .name(p.getName())
                .email(p.getEmail())
                .phone(p.getPhone())
                .gender(p.getGender())
                .taxId(p.getTaxId())
                .taxCountry(p.getTaxCountry())
                .residentialAddress(p.getResidentialAddress())
                .createdDate(p.getCreatedDate())
                .build();
        if (dto == null) throw new RuntimeException("Built DTO is null");
        return dto;
    }
}