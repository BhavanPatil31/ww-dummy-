package com.wealthwise.wealthwise_backend.goal.service;

import com.wealthwise.wealthwise_backend.goal.entity.Goal;
import com.wealthwise.wealthwise_backend.goal.repository.GoalRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class GoalService {
    @Autowired
    private GoalRepository goalRepository;

    public Goal addGoal(Goal goal) {
        return goalRepository.save(goal);
    }

    public List<Goal> getUserGoals(Integer userId) {
        return goalRepository.findByUserId(userId);
    }

    public Goal updateGoal(Integer id, Goal goalDetails) {
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
        
        return goalRepository.save(goal);
    }

    public void deleteGoal(Integer id) {
        goalRepository.deleteById(id);
    }
}
