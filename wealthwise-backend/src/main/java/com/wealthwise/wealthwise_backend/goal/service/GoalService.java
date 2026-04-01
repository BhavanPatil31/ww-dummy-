package com.wealthwise.wealthwise_backend.goal.service;

import com.wealthwise.wealthwise_backend.goal.entity.Goal;
import com.wealthwise.wealthwise_backend.goal.repository.GoalRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Objects;

@Service
public class GoalService {
    @Autowired
    private GoalRepository goalRepository;

    public Goal addGoal(Goal goal) {
        if (goal == null) throw new IllegalArgumentException("Goal cannot be null");
        return Objects.requireNonNull(goalRepository.save(goal));
    }

    public List<Goal> getUserGoals(Integer userId) {
        if (userId == null) throw new IllegalArgumentException("User ID cannot be null");
        return goalRepository.findByUserId(userId);
    }

    public Goal updateGoal(Integer id, Goal goalDetails) {
        if (id == null || goalDetails == null) throw new IllegalArgumentException("ID and Goal details cannot be null");
        Goal goal = goalRepository.findById(id).orElseThrow(() -> new RuntimeException("Goal not found with id " + id));
        goal.setGoalName(goalDetails.getGoalName());
        goal.setTargetAmount(goalDetails.getTargetAmount());
        goal.setTargetYear(goalDetails.getTargetYear());
        goal.setProgress(goalDetails.getProgress());
        
        // Relationship handle
        goal.getLinkedInvestments().clear();
        if (goalDetails.getLinkedInvestments() != null) {
            goal.getLinkedInvestments().addAll(goalDetails.getLinkedInvestments());
        }
        
        return Objects.requireNonNull(goalRepository.save(goal));
    }

    public void deleteGoal(Integer id) {
        if (id == null) throw new IllegalArgumentException("ID cannot be null");
        goalRepository.deleteById(id);
    }
}
