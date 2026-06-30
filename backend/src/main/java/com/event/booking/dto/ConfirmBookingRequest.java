package com.event.booking.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import java.util.List;

@Data
public class ConfirmBookingRequest {
    @NotBlank(message = "Event ID is required")
    private String eventId;

    @NotEmpty(message = "Seat numbers are required")
    private List<String> seatNumbers; // E.g., ["A12", "A13"]
}
