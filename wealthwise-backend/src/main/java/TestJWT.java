import com.wealthwise.wealthwise_backend.auth.util.JwtUtil;

public class TestJWT {
    public static void main(String[] args) {
        try {
            JwtUtil util = new JwtUtil();
            String token = util.generateToken("test@example.com");
            System.out.println("TOKEN: " + token);
        } catch (Throwable t) {
            t.printStackTrace();
        }
    }
}
