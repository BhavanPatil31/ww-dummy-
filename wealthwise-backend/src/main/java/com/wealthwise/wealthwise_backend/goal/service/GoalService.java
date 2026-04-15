package com.wealthwise.wealthwise_backend.goal.service;

import com.wealthwise.wealthwise_backend.goal.entity.Goal;
import com.wealthwise.wealthwise_backend.goal.entity.GoalInvestment;
import com.wealthwise.wealthwise_backend.goal.repository.GoalRepository;
import com.wealthwise.wealthwise_backend.investment.repository.InvestmentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.util.ArrayList;
import java.util.HashSet; 
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class GoalService {
    @Autowired
    private GoalRepository goalRepository;

    @Autowired
    private InvestmentRepository investmentRepository;

    public Goal addGoal(Goal goal) {
        if (goal == null) throw new IllegalArgumentException("Goal cannot be null");
        validateSingleGoalPerInvestment(goal, null);
        goal.setLinkedInvestments(sanitizeLinkedInvestments(goal.getLinkedInvestments()));
        return Objects.requireNonNull(goalRepository.save(goal));
    }

    public List<Goal> getUserGoals(Long userId) {
        if (userId == null) throw new IllegalArgumentException("User ID cannot be null");
        return goalRepository.findByUserId(userId);
    }

    public Goal updateGoal(Integer id, Goal goalDetails) {
        if (id == null || goalDetails == null) throw new IllegalArgumentException("ID and Goal details cannot be null");
        Goal goal = goalRepository.findById(id).orElseThrow(() -> new RuntimeException("Goal not found with id " + id));
        validateSingleGoalPerInvestment(goalDetails, id);

        goal.setGoalName(goalDetails.getGoalName());
        goal.setTargetAmount(goalDetails.getTargetAmount());
        goal.setTargetYear(goalDetails.getTargetYear());
        goal.setProgress(goalDetails.getProgress());
        
        // Relationship handle
        if (goal.getLinkedInvestments() == null) {
            goal.setLinkedInvestments(new ArrayList<>());
        } else {
            goal.getLinkedInvestments().clear();
        }
        goal.getLinkedInvestments().addAll(sanitizeLinkedInvestments(goalDetails.getLinkedInvestments()));
        
        return Objects.requireNonNull(goalRepository.save(goal));
    }

    public void deleteGoal(Integer id) {
        if (id == null) throw new IllegalArgumentException("ID cannot be null");
        goalRepository.deleteById(id);
    }

    private void validateSingleGoalPerInvestment(Goal goal, Integer excludeGoalId) {
        if (goal == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Goal payload is required");
        }
        if (goal.getUserId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "User ID is required");
        }

        List<GoalInvestment> linked = goal.getLinkedInvestments();
        if (linked == null || linked.isEmpty()) {
            return;
        }

        Set<Long> uniqueIds = new HashSet<>();
        List<Long> ids = new ArrayList<>();
        for (GoalInvestment gi : linked) {
            if (gi == null || gi.getInvestmentId() == null) continue;
            if (uniqueIds.add(gi.getInvestmentId())) {
                ids.add(gi.getInvestmentId());
            }
        }

        if (ids.isEmpty()) return;

        List<Long> alreadyLinked = goalRepository.findLinkedInvestmentIdsForUserExcludingGoal(
                goal.getUserId(),
                ids,
                excludeGoalId
        );

        if (alreadyLinked != null && !alreadyLinked.isEmpty()) {
            String conflictIds = alreadyLinked.stream()
                    .distinct()
                    .map(String::valueOf)
                    .collect(Collectors.joining(", "));
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Investment(s) already linked to another goal: " + conflictIds
            );
        }

        List<Long> activeIds = investmentRepository.findActiveIdsByUserIdAndIds(goal.getUserId(), ids);
        Set<Long> activeSet = new HashSet<>(activeIds);
        List<Long> inactiveOrMissing = ids.stream()
                .filter(id -> !activeSet.contains(id))
                .collect(Collectors.toList());

        if (!inactiveOrMissing.isEmpty()) {
            String badIds = inactiveOrMissing.stream()
                    .map(String::valueOf)
                    .collect(Collectors.joining(", "));
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Only active investments can be linked to a goal. Invalid investment(s): " + badIds
            );
        }
    }

    private List<GoalInvestment> sanitizeLinkedInvestments(List<GoalInvestment> linked) {
        List<GoalInvestment> out = new ArrayList<>();
        if (linked == null) return out;
        for (GoalInvestment gi : linked) {
            if (gi == null || gi.getInvestmentId() == null) continue;
            GoalInvestment clean = new GoalInvestment();
            clean.setInvestmentId(gi.getInvestmentId());
            clean.setLinkedAmount(gi.getLinkedAmount());
            out.add(clean);
        }
        return out;
    }
}
