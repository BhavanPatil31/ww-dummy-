package com.wealthwise.wealthwise_backend.goal.controller;

import com.wealthwise.wealthwise_backend.goal.entity.Goal;
import com.wealthwise.wealthwise_backend.goal.service.GoalService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/goals")
@CrossOrigin(origins = "*")
public class GoalController {
    
    @Autowired
    private GoalService goalService;

    @PostMapping("/add")
    public Goal addGoal(@RequestBody Goal goal) {
        return goalService.addGoal(goal);
    }

    @GetMapping("/user/{userId}")
    public List<Goal> getUserGoals(@PathVariable Integer userId) {
        return goalService.getUserGoals(userId);
    }

    @PutMapping("/{id}")
    public Goal updateGoal(@PathVariable Integer id, @RequestBody Goal goal) {
        return goalService.updateGoal(id, goal);
    }

    @DeleteMapping("/{id}")
    public void deleteGoal(@PathVariable Integer id) {
        goalService.deleteGoal(id);
    }
}
