package com.event.booking.websocket;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArraySet;

@Component
public class EventWebSocketHandler extends TextWebSocketHandler {

    // Map from eventId -> Set of active WebSocketSession connections
    private final Map<String, Set<WebSocketSession>> eventSessions = new ConcurrentHashMap<>();
    private final StringRedisTemplate redisTemplate;

    public EventWebSocketHandler(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        String eventId = getEventId(session);
        if (eventId != null) {
            eventSessions.computeIfAbsent(eventId, k -> new CopyOnWriteArraySet<>()).add(session);
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        String eventId = getEventId(session);
        if (eventId != null) {
            Set<WebSocketSession> sessions = eventSessions.get(eventId);
            if (sessions != null) {
                sessions.remove(session);
                if (sessions.isEmpty()) {
                    eventSessions.remove(eventId);
                }
            }
        }
    }

    /**
     * Broadcasts a seat update notification to the Redis Pub/Sub topic.
     *
     * @param eventId the event ID whose seat status changed
     */
    public void broadcastSeatUpdate(String eventId) {
        redisTemplate.convertAndSend("channel:seat-updates", eventId);
    }

    /**
     * Broadcasts a seat update notification to all local WebSocket sessions.
     * Called by the RedisSubscriber when a message is received.
     *
     * @param eventId the event ID whose seat status changed
     */
    public void broadcastSeatUpdateLocally(String eventId) {
        Set<WebSocketSession> sessions = eventSessions.get(eventId);
        if (sessions != null) {
            TextMessage message = new TextMessage("{\"type\":\"SEAT_UPDATE\",\"eventId\":\"" + eventId + "\"}");
            for (WebSocketSession session : sessions) {
                if (session.isOpen()) {
                    try {
                        session.sendMessage(message);
                    } catch (IOException e) {
                        // Suppress exception for disconnected clients; they will be removed on close
                    }
                }
            }
        }
    }

    private String getEventId(WebSocketSession session) {
        String path = session.getUri().getPath();
        int lastSlash = path.lastIndexOf('/');
        if (lastSlash != -1 && lastSlash < path.length() - 1) {
            return path.substring(lastSlash + 1);
        }
        return null;
    }
}
