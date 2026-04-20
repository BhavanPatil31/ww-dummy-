package com.wealthwise.wealthwise_backend.ai.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.wealthwise.wealthwise_backend.auth.entity.User;
import com.wealthwise.wealthwise_backend.goal.entity.Goal;
import com.wealthwise.wealthwise_backend.goal.entity.GoalInvestment;
import com.wealthwise.wealthwise_backend.goal.service.GoalService;
import com.wealthwise.wealthwise_backend.investment.dto.HoldingDTO;
import com.wealthwise.wealthwise_backend.investment.dto.InvestmentActivityDTO;
import com.wealthwise.wealthwise_backend.investment.dto.PortfolioDTO;
import com.wealthwise.wealthwise_backend.portfolio.service.PortfolioService;
import com.wealthwise.wealthwise_backend.tax.dto.TaxTransactionDTO;
import com.wealthwise.wealthwise_backend.tax.service.TaxService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.server.ResponseStatusException;

import java.text.NumberFormat;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class AIChatService {

    private final PortfolioService portfolioService;
    private final GoalService goalService;
    private final TaxService taxService;
    private final WebClient webClient;

    @Value("${gemini.api.key:}")
    private String geminiApiKey;

    @Value("${gemini.api.model:gemini-1.5-flash}")
    private String geminiModel;

    @Value("${gemini.api.url:https://generativelanguage.googleapis.com/v1beta/models}")
    private String geminiApiUrl;

    public AIChatService(
            PortfolioService portfolioService,
            GoalService goalService,
            TaxService taxService,
            WebClient webClient
    ) {
        this.portfolioService = portfolioService;
        this.goalService = goalService;
        this.taxService = taxService;
        this.webClient = webClient;
    }

    public String chat(User user, String message) {
        if (user == null || user.getUser_id() == null) {
            throw new ResponseStatusException((org.springframework.http.HttpStatusCode) HttpStatus.UNAUTHORIZED, "Authenticated user is required");
        }
        if (message == null || message.trim().isEmpty()) {
            throw new ResponseStatusException((org.springframework.http.HttpStatusCode) HttpStatus.BAD_REQUEST, "Message cannot be empty");
        }
        if (geminiApiKey == null || geminiApiKey.isBlank()) {
            throw new ResponseStatusException((org.springframework.http.HttpStatusCode) HttpStatus.INTERNAL_SERVER_ERROR, "GEMINI_API_KEY is not configured");
        }

        PortfolioDTO portfolio = portfolioService.computeDetailedPortfolio(user.getUser_id());
        List<Goal> goals = goalService.getUserGoals(user.getUser_id());
        String currentFinancialYear = currentFinancialYear();
        List<TaxTransactionDTO> taxSummary = taxService.getTaxSummary(user.getUser_id(), currentFinancialYear);

        Map<String, Object> payload = buildGeminiRequest(buildSystemPrompt(user, portfolio, goals, taxSummary, currentFinancialYear), message);

        JsonNode response = webClient.post()
        		  .uri(geminiApiUrl + "/" + geminiModel + ":generateContent?key=" + geminiApiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(payload)
                .retrieve()
                .onStatus(
                        status -> status.is4xxClientError() || status.is5xxServerError(),
                        clientResponse -> clientResponse.bodyToMono(String.class)
                                .map(body -> new ResponseStatusException(
                                        (org.springframework.http.HttpStatusCode) HttpStatus.BAD_GATEWAY,
                                        "Gemini API request failed: " + body
                                ))
                )
                .bodyToMono(JsonNode.class)
                .block();

        String reply = extractReply(response);
        if (reply == null || reply.isBlank()) {
            throw new ResponseStatusException((org.springframework.http.HttpStatusCode) HttpStatus.BAD_GATEWAY, "Gemini returned an empty reply");
        }
        return reply.trim();
    }

    private Map<String, Object> buildGeminiRequest(String systemPrompt, String userMessage) {
        Map<String, Object> payload = new LinkedHashMap<>();

        payload.put("systemInstruction", Map.of(
                "parts", List.of(Map.of("text", systemPrompt))
        ));

        payload.put("contents", List.of(
                Map.of(
                        "role", "user",
                        "parts", List.of(
                                Map.of("text", userMessage.trim())
                        )
                )
        ));

        payload.put("generationConfig", Map.of(
                "temperature", 0.3,
                "topP", 0.9,
                "maxOutputTokens", 4096
        ));
        
        return payload;
    }

    private String buildSystemPrompt(
            User user,
            PortfolioDTO portfolio,
            List<Goal> goals,
            List<TaxTransactionDTO> taxSummary,
            String currentFinancialYear
    ) {
        String userName = safe(user.getName());
        StringBuilder prompt = new StringBuilder();
        prompt.append("You are the WealthWise AI Assistant. Your goal is to provide ").append(userName).append(" with expert-level financial guidance based on their portfolio data.\n\n");
        prompt.append("Guidelines:\n\n");
        prompt.append("Tone: Professional, encouraging, and clear. Avoid overly dense financial jargon unless asked.\n\n");
        prompt.append("Context: You have access to ").append(userName).append("'s holdings, tax reports, and goals. Always cross-reference these when giving advice.\n\n");
        prompt.append("Safety First: Always include a small disclaimer that you are an AI and not a licensed financial advisor for high-stakes decisions.\n\n");
        prompt.append("Formatting: Use Markdown tables for comparing stocks or funds and bold text for key figures like ₹ Amount or % Returns.\n\n");
        prompt.append("Proactive: If ").append(userName).append(" asks about tax, mention their current tax-saving goal if one exists.\n\n");

        prompt.append("USER PROFILE\n");
        prompt.append("Name: ").append(safe(user.getName())).append("\n");
        prompt.append("Email: ").append(safe(user.getEmail())).append("\n\n");

        prompt.append("PORTFOLIO SUMMARY\n");
        prompt.append("Total Invested: ").append(formatCurrency(portfolio.getTotalInvested())).append("\n");
        prompt.append("Current Value: ").append(formatCurrency(portfolio.getPortfolioValue())).append("\n");
        prompt.append("Unrealized Gain/Loss: ").append(formatSignedCurrency(portfolio.getProfitLoss())).append("\n");
        prompt.append("Return Percentage: ").append(formatPercent(portfolio.getReturnPercentage())).append("\n");
        prompt.append("XIRR: ").append(formatPercent(portfolio.getXirr())).append("\n");
        prompt.append("CAGR: ").append(formatPercent(portfolio.getCagr())).append("\n\n");

        prompt.append("HOLDINGS WITH NAV\n");
        if (portfolio.getActiveHoldings() == null || portfolio.getActiveHoldings().isEmpty()) {
            prompt.append("- No active holdings found.\n");
        } else {
            for (HoldingDTO holding : portfolio.getActiveHoldings()) {
                prompt.append("- ")
                        .append(safe(holding.getFundName()))
                        .append(" | Units: ").append(formatUnits(holding.getTotalUnits()))
                        .append(" | Invested: ").append(formatCurrency(holding.getInvestedAmount()))
                        .append(" | NAV: ").append(holding.getLatestNav() == null ? "N/A" : formatNav(holding.getLatestNav()))
                        .append(" | Current Value: ").append(formatCurrency(holding.getCurrentValue()))
                        .append(" | Return: ").append(formatPercent(holding.getReturnPercentage()))
                        .append("\n");
            }
        }

        prompt.append("\nGOALS\n");
        if (goals == null || goals.isEmpty()) {
            prompt.append("- No goals found.\n");
        } else {
            for (Goal goal : goals) {
                prompt.append("- ")
                        .append(safe(goal.getGoalName()))
                        .append(" | Target: ").append(formatCurrency(goal.getTargetAmount()))
                        .append(" | Target Year: ").append(goal.getTargetYear() == null ? "N/A" : goal.getTargetYear())
                        .append(" | Progress: ").append(goal.getProgress() == null ? "N/A" : formatPercent(goal.getProgress()))
                        .append(" | Linked Investments: ").append(formatGoalLinks(goal.getLinkedInvestments()))
                        .append("\n");
            }
        }

        prompt.append("\nRECENT INVESTMENTS\n");
        List<InvestmentActivityDTO> recentActivity = portfolio.getRecentActivity();
        if (recentActivity == null || recentActivity.isEmpty()) {
            prompt.append("- No recent activity found.\n");
        } else {
            for (InvestmentActivityDTO activity : recentActivity.stream().limit(8).collect(Collectors.toList())) {
                prompt.append("- ")
                        .append(safe(activity.getSchemeName()))
                        .append(" | Type: ").append(safe(activity.getType()))
                        .append(" | Date: ").append(safe(activity.getDate()))
                        .append(" | Amount: ").append(formatCurrency(activity.getAmount()))
                        .append("\n");
            }
        }

        prompt.append("\nTAX SUMMARY (").append(currentFinancialYear).append(")\n");
        if (taxSummary == null || taxSummary.isEmpty()) {
            prompt.append("- No tax transactions found for this financial year.\n");
        } else {
            double totalTaxGain = 0.0;
            for (TaxTransactionDTO tax : taxSummary.stream().limit(10).collect(Collectors.toList())) {
                totalTaxGain += tax.getGain() == null ? 0.0 : tax.getGain();
                prompt.append("- ")
                        .append(safe(tax.getFundName()))
                        .append(" | Buy: ").append(tax.getBuyDate() == null ? "N/A" : tax.getBuyDate())
                        .append(" | Sell: ").append(tax.getSellDate() == null ? "N/A" : tax.getSellDate())
                        .append(" | Type: ").append(safe(tax.getType()))
                        .append(" | Gain: ").append(formatSignedCurrency(tax.getGain()))
                        .append("\n");
            }
            prompt.append("Total Realized Gain/Loss: ").append(formatSignedCurrency(totalTaxGain)).append("\n");
        }

        prompt.append("\nRESPONSE RULES\n");
        prompt.append("- Reference the user's actual numbers when relevant.\n");
        prompt.append("- If the user asks about portfolio health, comment on concentration, gains/losses, and next steps.\n");
        prompt.append("- If the user asks about goals, relate holdings to goal progress and suggest actions.\n");
        prompt.append("- If the user asks about taxes, summarize the visible tax data and explicitly note this is informational only.\n");
        prompt.append("- If data is missing, say what is missing instead of inventing it.\n");
        return prompt.toString();
    }

    private String extractReply(JsonNode response) {
        if (response == null) {
            return null;
        }

        JsonNode candidates = response.path("candidates");
        if (!candidates.isArray() || candidates.isEmpty()) {
            return null;
        }

        JsonNode firstCandidate = candidates.get(0);

        // Gemini generateMessage response format
        JsonNode content = firstCandidate.path("content");
        if (content.isArray() && !content.isEmpty()) {
            StringBuilder reply = new StringBuilder();
            for (JsonNode segment : content) {
                String text = segment.path("text").asText("");
                if (!text.isBlank()) {
                    if (reply.length() > 0) reply.append("\n");
                    reply.append(text.trim());
                }
            }
            if (reply.length() > 0) {
                return reply.toString();
            }
        }

        // Backward-compatible path for older response formats
        JsonNode parts = firstCandidate.path("content").path("parts");
        if (parts.isArray() && !parts.isEmpty()) {
            StringBuilder reply = new StringBuilder();
            for (JsonNode part : parts) {
                String text = part.path("text").asText("");
                if (!text.isBlank()) {
                    if (reply.length() > 0) reply.append("\n");
                    reply.append(text.trim());
                }
            }
            return reply.toString();
        }

        return null;
    }

    private String formatGoalLinks(List<GoalInvestment> linkedInvestments) {
        if (linkedInvestments == null || linkedInvestments.isEmpty()) {
            return "None";
        }
        return linkedInvestments.stream()
                .map(link -> "Investment #" + link.getInvestmentId())
                .collect(Collectors.joining(", "));
    }

    private String safe(String value) {
        return value == null || value.isBlank() ? "N/A" : value;
    }

    private String formatCurrency(Double value) {
        return formatCurrency(value == null ? 0.0 : value.doubleValue());
    }

    private String formatCurrency(double value) {
        NumberFormat formatter = NumberFormat.getCurrencyInstance(Locale.of("en", "IN"));
        formatter.setMaximumFractionDigits(2);
        return formatter.format(value);
    }

    private String formatSignedCurrency(Double value) {
        return formatSignedCurrency(value == null ? 0.0 : value.doubleValue());
    }

    private String formatSignedCurrency(double value) {
        String formatted = formatCurrency(Math.abs(value));
        if (value > 0) return "+" + formatted;
        if (value < 0) return "-" + formatted;
        return formatted;
    }

    private String formatPercent(Double value) {
        if (value == null) return "N/A";
        return formatPercent(value.doubleValue());
    }

    private String formatPercent(double value) {
        return String.format(Locale.US, "%.2f%%", value);
    }

    private String formatUnits(double value) {
        return String.format(Locale.US, "%.4f", value);
    }

    private String formatNav(double value) {
        return String.format(Locale.US, "%.4f", value);
    }

    private String currentFinancialYear() {
        LocalDate today = LocalDate.now();
        int startYear = today.getMonthValue() >= 4 ? today.getYear() : today.getYear() - 1;
        return startYear + "-" + (startYear + 1);
    }
}
