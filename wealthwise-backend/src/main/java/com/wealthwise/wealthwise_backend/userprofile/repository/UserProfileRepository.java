package com.wealthwise.wealthwise_backend.userprofile.repository;

import com.wealthwise.wealthwise_backend.userprofile.entity.UserProfileDetails;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface UserProfileRepository extends JpaRepository<UserProfileDetails, Long> {


    @Query("SELECT u FROM UserProfileDetails u WHERE u.userId = :userId")
    Optional<UserProfileDetails> findByUserId(@Param("userId") Long userId);

    @Query("SELECT u FROM UserProfileDetails u WHERE u.email = :email")
    Optional<UserProfileDetails> findByEmail(@Param("email") String email);
}