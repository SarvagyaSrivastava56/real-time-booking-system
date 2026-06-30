package com.event.booking.controller;

import com.event.booking.dto.HoldSeatRequest;
import com.event.booking.dto.SeatResponse;
import com.event.booking.security.CustomUserPrincipal;
import com.event.booking.service.SeatService;
import com.event.booking.websocket.EventWebSocketHandler;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/seats")
public class SeatController {

    private final SeatService seatService;
    private final EventWebSocketHandler webSocketHandler;

    public SeatController(SeatService seatService, EventWebSocketHandler webSocketHandler) {
        this.seatService = seatService;
        this.webSocketHandler = webSocketHandler;
    }

    @GetMapping("/event/{eventId}")
    public ResponseEntity<List<SeatResponse>> getSeatsForEvent(@PathVariable String eventId) {
        return ResponseEntity.ok(seatService.getSeatsForEvent(eventId));
    }

    @PostMapping("/hold")
    public ResponseEntity<Map<String, String>> holdSeat(
            @Valid @RequestBody HoldSeatRequest request,
            @AuthenticationPrincipal CustomUserPrincipal principal) {
        
        seatService.holdSeat(request.getEventId(), request.getSeatId(), principal.getUserId());
        webSocketHandler.broadcastSeatUpdate(request.getEventId());
        return ResponseEntity.ok(Map.of("message", "Seat hold successful. Held for 5 minutes."));
    }

    @PostMapping("/release")
    public ResponseEntity<Map<String, String>> releaseSeat(
            @Valid @RequestBody HoldSeatRequest request,
            @AuthenticationPrincipal CustomUserPrincipal principal) {
        
        seatService.releaseSeat(request.getEventId(), request.getSeatId(), principal.getUserId());
        webSocketHandler.broadcastSeatUpdate(request.getEventId());
        return ResponseEntity.ok(Map.of("message", "Seat release successful."));
    }
}
