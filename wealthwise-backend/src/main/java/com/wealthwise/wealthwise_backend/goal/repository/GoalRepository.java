package com.wealthwise.wealthwise_backend.goal.repository;

import com.wealthwise.wealthwise_backend.goal.entity.Goal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface GoalRepository extends JpaRepository<Goal, Integer> {
    List<Goal> findByUserId(Long userId);

    @Query(value = "SELECT gi.investment_id " +
            "FROM goal_investments gi " +
            "JOIN goals g ON g.goal_id = gi.goal_id " +
            "WHERE g.user_id = :userId " +
            "AND gi.investment_id IN (:investmentIds) " +
            "AND (:excludeGoalId IS NULL OR gi.goal_id <> :excludeGoalId)", nativeQuery = true)
    List<Long> findLinkedInvestmentIdsForUserExcludingGoal(
            @Param("userId") Long userId,
            @Param("investmentIds") List<Long> investmentIds,
            @Param("excludeGoalId") Integer excludeGoalId
    );
}

