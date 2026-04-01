package com.wealthwise.wealthwise_backend.goal.repository;

import com.wealthwise.wealthwise_backend.goal.entity.Goal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface GoalRepository extends JpaRepository<Goal, Integer> {
    List<Goal> findByUserId(Integer userId);
}
