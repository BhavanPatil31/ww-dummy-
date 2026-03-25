package com.wealthwise.wealthwise_backend.userprofile.service;

import com.wealthwise.wealthwise_backend.userprofile.dto.UpdateEmailRequest;
import com.wealthwise.wealthwise_backend.userprofile.dto.UpdateNameRequest;
import com.wealthwise.wealthwise_backend.userprofile.dto.UpdatePhoneRequest;
import com.wealthwise.wealthwise_backend.userprofile.dto.UserProfileDTO;
import com.wealthwise.wealthwise_backend.userprofile.entity.ProfileActivityLog;
import com.wealthwise.wealthwise_backend.userprofile.entity.UserProfileDetails;
import com.wealthwise.wealthwise_backend.userprofile.repository.ProfileActivityLogRepository;
import com.wealthwise.wealthwise_backend.userprofile.repository.UserProfileRepository;
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
    private com.wealthwise.wealthwise_backend.auth.service.AuthService authService;

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
        UserProfileDetails savedEntity = repository.save(profile);
        UserProfileDetails saved = Objects.requireNonNull(savedEntity, "Saved profile cannot be null");

        logRepository.save(new ProfileActivityLog(
            Objects.requireNonNull(saved.getUserId(), "User ID cannot be null"), "PROFILE CREATED", null, "Profile created"
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
        UserProfileDetails profile = Objects.requireNonNull(
            repository.findByUserId(userId).orElseThrow(() -> new RuntimeException("Profile not found for userId: " + userId)),
            "Found profile is null"
        );
        return toDTO(profile);
    }

    @NonNull
    public UserProfileDTO updateName(@NonNull Long profileId, @NonNull UpdateNameRequest request) {
        if (request.getName() == null || request.getName().trim().isEmpty()) throw new IllegalArgumentException("Name cannot be empty");
        
        UserProfileDetails profile = findById(profileId);
        String oldName = profile.getName();
        profile.setName(request.getName().trim());
        
        UserProfileDetails savedEntity = repository.save(profile);
        UserProfileDetails saved = Objects.requireNonNull(savedEntity, "Saved profile cannot be null");

        authService.updateUserName(Objects.requireNonNull(profile.getUserId(), "User ID cannot be null"), Objects.requireNonNull(saved.getName(), "Name cannot be null"));
        logRepository.save(new ProfileActivityLog(saved.getUserId(), "Name", oldName, saved.getName()));

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
        
        UserProfileDetails savedEntity = repository.save(profile);
        UserProfileDetails saved = Objects.requireNonNull(savedEntity, "Saved profile cannot be null");

        authService.updateUserEmail(Objects.requireNonNull(profile.getUserId(), "User ID cannot be null"), Objects.requireNonNull(saved.getEmail(), "Email cannot be null"));
        logRepository.save(new ProfileActivityLog(saved.getUserId(), "Email", oldEmail, saved.getEmail()));

        return toDTO(saved);
    }

    @NonNull
    public UserProfileDTO updatePhone(@NonNull Long profileId, @NonNull UpdatePhoneRequest request) {
        if (request.getPhone() == null || request.getPhone().trim().isEmpty()) throw new IllegalArgumentException("Phone cannot be empty");

        UserProfileDetails profile = findById(profileId);
        String oldPhone = profile.getPhone();
        profile.setPhone(request.getPhone().trim());
        
        UserProfileDetails savedEntity = repository.save(profile);
        UserProfileDetails saved = Objects.requireNonNull(savedEntity, "Saved profile cannot be null");

        logRepository.save(new ProfileActivityLog(saved.getUserId(), "Phone", oldPhone, saved.getPhone()));

        return toDTO(saved);
    }

    @NonNull
    public UserProfileDTO updateDetails(@NonNull Long profileId, @NonNull UserProfileDTO request) {
        UserProfileDetails profile = findById(profileId);
        if (request.getGender() != null) profile.setGender(request.getGender());
        if (request.getTaxId() != null) profile.setTaxId(request.getTaxId());
        if (request.getTaxCountry() != null) profile.setTaxCountry(request.getTaxCountry());
        if (request.getResidentialAddress() != null) profile.setResidentialAddress(request.getResidentialAddress());
        
        UserProfileDetails savedEntity = repository.save(profile);
        UserProfileDetails saved = Objects.requireNonNull(savedEntity, "Saved profile cannot be null");

        logRepository.save(new ProfileActivityLog(saved.getUserId(), "Profile Details", "Old Details", "Updated Details"));

        return toDTO(saved);
    }

    public void deleteProfile(@NonNull Long profileId) {
        if (!repository.existsById(profileId)) throw new RuntimeException("Profile not found with id: " + profileId);
        repository.deleteById(profileId);
    }

    @NonNull
    public List<ProfileActivityLog> getActivityLog(@NonNull Long userId) {
        // ✅ Wrap the list return to guarantee non-nullity
        return Objects.requireNonNull(
            logRepository.findByUserIdOrderByChangedAtDesc(userId),
            "Activity log is null"
        );
    }

    @NonNull
    private UserProfileDetails findById(@NonNull Long profileId) {
        // ✅ Dual guarantee for findById
        return Objects.requireNonNull(
            repository.findById(profileId).orElseThrow(() -> new RuntimeException("Profile not found with id: " + profileId)),
            "Found profile details are null"
        );
    }

    @NonNull
    private UserProfileDTO toDTO(@NonNull UserProfileDetails p) {
        // ✅ Wrap the build result to satisfy @NonNull return contract
        return Objects.requireNonNull(UserProfileDTO.builder()
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
                .build(), "Built DTO is null");
    }
}