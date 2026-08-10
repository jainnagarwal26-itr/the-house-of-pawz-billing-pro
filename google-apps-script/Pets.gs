// ============================================================
// Pets.gs — Pet Master API
// Project: The House of Pawz – Billing Pro
// ============================================================

function getPets(token, params) {
  try {
    var auth = requireAuth(token);
    requirePermission(auth, 'pets_view');

    var sheet = getSheet(CONFIG.SHEETS.PETS);
    var pets = sheetToObjects(sheet);

    if (params && params.customerID) {
      pets = pets.filter(function(p) { return p.CustomerID === params.customerID; });
    }
    if (params && params.boardingOnly) {
      pets = pets.filter(function(p) { return String(p.IsBoardingNow).toLowerCase() === 'true'; });
    }

    return successResponse({ pets: pets, totalCount: pets.length });
  } catch (e) {
    return errorResponse('SERVER_ERROR', e.message || 'Failed to retrieve pets.');
  }
}

function savePet(token, petData) {
  try {
    var auth = requireAuth(token);
    var sheet = getSheet(CONFIG.SHEETS.PETS);
    var isUpdate = false;
    if (petData.PetID) {
      var existing = findRowByKey(sheet, 'PetID', petData.PetID);
      if (existing) {
        isUpdate = true;
      }
    }

    if (isUpdate) {
      requirePermission(auth, 'pets_edit');
      petData.UpdatedAt = nowIST();
      delete petData.CreatedAt;
      updateRowByKey(sheet, 'PetID', petData.PetID, petData);
      logAudit(auth.userID, auth.username, auth.role, CONFIG.AUDIT_ACTIONS.PET_UPDATED,
        'Updated pet: ' + petData.PetName + ' (' + petData.PetID + ')', '');
      return successResponse({ petID: petData.PetID }, 'Pet updated.');
    } else {
      requirePermission(auth, 'pets_create');
      if (!petData.PetName || !petData.CustomerID) {
        return errorResponse('INVALID_INPUT', 'PetName and CustomerID are required.');
      }
      var seq = getNextSequence(sheet, 'PetID');
      var petID = generateID(CONFIG.ID_PREFIX.PET, seq);

      appendRow(sheet, {
        PetID:              petID,
        CustomerID:         petData.CustomerID,
        CustomerName:       sanitizeInput(petData.CustomerName || ''),
        PetName:            sanitizeInput(petData.PetName),
        Species:            sanitizeInput(petData.Species || ''),
        Breed:              sanitizeInput(petData.Breed || ''),
        Age:                petData.Age || '',
        Gender:             petData.Gender || '',
        VaccinationStatus:  petData.VaccinationStatus || 'Unknown',
        MedicalNotes:       sanitizeInput(petData.MedicalNotes || ''),
        FeedingPreferences: sanitizeInput(petData.FeedingPreferences || ''),
        MicrochipID:        petData.MicrochipID || '',
        Barcode:            petData.Barcode || '',
        IsBoardingNow:      petData.IsBoardingNow ? 'true' : 'false',
        CheckInDate:        petData.CheckInDate || '',
        CheckOutDate:       petData.CheckOutDate || '',
        RoomNo:             petData.RoomNo || '',
        CreatedAt:          nowIST(),
        UpdatedAt:          nowIST()
      });

      logAudit(auth.userID, auth.username, auth.role, CONFIG.AUDIT_ACTIONS.PET_CREATED,
        'Created new pet: ' + petData.PetName + ' for CustomerID: ' + petData.CustomerID, '');
      return successResponse({ petID: petID }, 'Pet created.');
    }
  } catch (e) {
    return errorResponse('SERVER_ERROR', e.message || 'Failed to save pet.');
  }
}

/**
 * API: Delete a pet profile. Requires pets_delete permission.
 */
function deletePet(token, petID) {
  try {
    var auth = requireAuth(token);
    requirePermission(auth, 'pets_delete');

    var sheet = getSheet(CONFIG.SHEETS.PETS);
    var deleted = deleteRowByKey(sheet, 'PetID', petID);
    if (!deleted) return errorResponse('NOT_FOUND', 'Pet not found to delete.');

    logAudit(auth.userID, auth.username, auth.role, CONFIG.AUDIT_ACTIONS.PET_UPDATED,
      'Deleted pet: ' + petID, '');

    return successResponse(null, 'Pet deleted.');
  } catch (e) {
    return errorResponse('SERVER_ERROR', e.message || 'Failed to delete pet.');
  }
}

function updateBoardingStatus(token, petID, isBoardingNow, roomNo, checkInDate, checkOutDate) {
  try {
    var auth = requireAuth(token);
    requirePermission(auth, 'pets_edit');

    var sheet = getSheet(CONFIG.SHEETS.PETS);
    var pet = findRowByKey(sheet, 'PetID', petID);
    if (!pet) return errorResponse('NOT_FOUND', 'Pet not found: ' + petID);

    updateRowByKey(sheet, 'PetID', petID, {
      IsBoardingNow: isBoardingNow ? 'true' : 'false',
      RoomNo:        roomNo || '',
      CheckInDate:   checkInDate || '',
      CheckOutDate:  checkOutDate || '',
      UpdatedAt:     nowIST()
    });

    logAudit(auth.userID, auth.username, auth.role, CONFIG.AUDIT_ACTIONS.PET_UPDATED,
      'Boarding status updated for pet: ' + pet.PetName + ' → ' + (isBoardingNow ? 'Checked-In' : 'Checked-Out'), '');
    return successResponse(null, 'Boarding status updated.');
  } catch (e) {
    return errorResponse('SERVER_ERROR', e.message || 'Failed to update boarding status.');
  }
}
